import argparse
import csv
import random
from dataclasses import dataclass

from app.recommender.bmf import BiasedMatrixFactorization, Interaction


@dataclass
class RawRow:
    user: str
    event: str
    rating: float


def load_train_csv(path: str) -> list[RawRow]:
    rows: list[RawRow] = []
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            interested = row["interested"].strip() == "1"
            not_interested = row["not_interested"].strip() == "1"
            # Rows where the user clicked neither button carry no clear
            # preference signal -- skip them rather than guessing a rating.
            if not interested and not not_interested:
                continue
            rating = 1.0 if interested else 0.0
            rows.append(RawRow(user=row["user"], event=row["event"], rating=rating))
    return rows


def train_val_split(rows: list[RawRow], val_fraction: float, seed: int) -> tuple[list[RawRow], list[RawRow]]:
    rng = random.Random(seed)
    shuffled = rows[:]
    rng.shuffle(shuffled)
    cutoff = int(len(shuffled) * (1 - val_fraction))
    return shuffled[:cutoff], shuffled[cutoff:]


def build_indices(rows: list[RawRow]) -> tuple[dict[str, int], dict[str, int]]:
    user_ids = sorted({r.user for r in rows})
    event_ids = sorted({r.event for r in rows})
    return {u: i for i, u in enumerate(user_ids)}, {e: i for i, e in enumerate(event_ids)}


def to_interactions(rows: list[RawRow], user_index: dict[str, int], event_index: dict[str, int]) -> list[Interaction]:
    result = []
    for r in rows:
        # Validation rows can reference a user or event never seen during
        # training (cold start) -- skip those for RMSE, report separately
        # as a coverage percentage instead of silently biasing the metric.
        if r.user not in user_index or r.event not in event_index:
            continue
        result.append(Interaction(user_index[r.user], event_index[r.event], r.rating))
    return result


def rmse(model: BiasedMatrixFactorization, interactions: list[Interaction]) -> float:
    if not interactions:
        return float("nan")
    total = 0.0
    for it in interactions:
        pred = model.predict(it.user_idx, it.item_idx)
        total += (pred - it.rating) ** 2
    return (total / len(interactions)) ** 0.5


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--train", required=True, help="Path to train.csv from the e-class dataset")
    parser.add_argument("--max-rows", type=int, default=200_000, help="Cap on rows loaded, for runtime control")
    parser.add_argument("--val-fraction", type=float, default=0.2)
    parser.add_argument("--n-factors", type=int, default=10)
    parser.add_argument("--n-epochs", type=int, default=20)
    parser.add_argument("--learning-rate", type=float, default=0.01)
    parser.add_argument("--regularization", type=float, default=0.02)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    print(f"Loading {args.train} ...")
    rows = load_train_csv(args.train)
    print(f"Loaded {len(rows)} labeled rows (interested=1 or not_interested=1).")

    if len(rows) > args.max_rows:
        rng = random.Random(args.seed)
        rows = rng.sample(rows, args.max_rows)
        print(f"Subsampled down to {len(rows)} rows (--max-rows={args.max_rows}).")

    train_rows, val_rows = train_val_split(rows, args.val_fraction, args.seed)
    print(f"Train rows: {len(train_rows)}, validation rows: {len(val_rows)}")

    user_index, event_index = build_indices(train_rows)
    print(f"Users in training set: {len(user_index)}, events in training set: {len(event_index)}")

    train_interactions = to_interactions(train_rows, user_index, event_index)
    val_interactions = to_interactions(val_rows, user_index, event_index)
    coverage = len(val_interactions) / len(val_rows) if val_rows else 0.0
    print(
        f"Validation rows usable for RMSE (user & event both seen in training): "
        f"{len(val_interactions)}/{len(val_rows)} ({coverage:.1%})"
    )

    model = BiasedMatrixFactorization(
        n_users=len(user_index),
        n_items=len(event_index),
        n_factors=args.n_factors,
        learning_rate=args.learning_rate,
        regularization=args.regularization,
        n_epochs=args.n_epochs,
        random_state=args.seed,
    )

    print(f"Training BiasedMatrixFactorization ({args.n_epochs} epochs, {args.n_factors} factors) ...")
    model.fit(train_interactions)

    train_error = rmse(model, train_interactions)
    val_error = rmse(model, val_interactions)

    # Trivial "always predict the training mean" baseline. If the trained
    # model can't beat this, the learned factors aren't adding real value.
    baseline_rmse = (
        (sum((model.global_mean - it.rating) ** 2 for it in val_interactions) / len(val_interactions)) ** 0.5
        if val_interactions
        else float("nan")
    )

    print("\n--- Results ---")
    print(f"Train RMSE:            {train_error:.4f}")
    print(f"Validation RMSE:       {val_error:.4f}")
    print(f"Baseline (mean) RMSE:  {baseline_rmse:.4f}")
    if val_interactions:
        improvement = (baseline_rmse - val_error) / baseline_rmse * 100
        print(f"Improvement over baseline: {improvement:.1f}%")


if __name__ == "__main__":
    main()
