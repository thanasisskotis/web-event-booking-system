from dataclasses import dataclass

import numpy as np


@dataclass
class Interaction:
    user_idx: int
    item_idx: int
    rating: float


class BiasedMatrixFactorization:
    """Biased Matrix Factorization trained with SGD, from scratch (NumPy only).

    x_hat_ij = mu + b_i + c_j + v_i . f_j

    See curriculum/ch8.md for the derivation of the update rules.
    """

    def __init__(
        self,
        n_users: int,
        n_items: int,
        n_factors: int = 10,
        learning_rate: float = 0.01,
        regularization: float = 0.02,
        n_epochs: int = 50,
        random_state: int | None = 42,
    ):
        self.n_users = n_users
        self.n_items = n_items
        self.n_factors = n_factors
        self.learning_rate = learning_rate
        self.regularization = regularization
        self.n_epochs = n_epochs

        rng = np.random.default_rng(random_state)
        self.user_factors = rng.normal(scale=0.1, size=(n_users, n_factors))
        self.item_factors = rng.normal(scale=0.1, size=(n_items, n_factors))
        self.user_bias = np.zeros(n_users)
        self.item_bias = np.zeros(n_items)
        self.global_mean = 0.0

    def fit(self, interactions: list[Interaction]) -> "BiasedMatrixFactorization":
        if not interactions:
            return self

        ratings = np.array([r.rating for r in interactions], dtype=float)
        self.global_mean = float(ratings.mean())

        for _ in range(self.n_epochs):
            for interaction in interactions:
                u, i, x = interaction.user_idx, interaction.item_idx, interaction.rating

                prediction = (
                    self.global_mean
                    + self.user_bias[u]
                    + self.item_bias[i]
                    + self.user_factors[u] @ self.item_factors[i]
                )
                error = x - prediction

                self.user_bias[u] += self.learning_rate * (error - self.regularization * self.user_bias[u])
                self.item_bias[i] += self.learning_rate * (error - self.regularization * self.item_bias[i])

                user_vec = self.user_factors[u].copy()
                item_vec = self.item_factors[i].copy()
                self.user_factors[u] += self.learning_rate * (error * item_vec - self.regularization * user_vec)
                self.item_factors[i] += self.learning_rate * (error * user_vec - self.regularization * item_vec)

        return self

    def predict(self, user_idx: int, item_idx: int) -> float:
        return float(
            self.global_mean
            + self.user_bias[user_idx]
            + self.item_bias[item_idx]
            + self.user_factors[user_idx] @ self.item_factors[item_idx]
        )

    def predict_all_for_user(self, user_idx: int) -> np.ndarray:
        return (
            self.global_mean
            + self.user_bias[user_idx]
            + self.item_bias
            + self.item_factors @ self.user_factors[user_idx]
        )
