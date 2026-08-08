// Normalizes an axios/FastAPI error into a plain string safe to render.
//
// FastAPI returns `detail` as a STRING for HTTPException (our 400/403/404/409),
// but as an ARRAY of { loc, msg, type } objects for 422 request-validation
// errors (e.g. the capacity invariant). Passing that array straight into a
// notification/message renders objects as React children and crashes the page,
// so flatten the array into its human-readable messages here.
export function getErrorMessage(err, fallback = "Something went wrong") {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      // Pydantic v2 prefixes custom validator messages with "Value error, ";
      // strip it so the user sees just our sentence.
      .map((d) => d?.msg?.replace(/^Value error,\s*/, ""))
      .filter(Boolean);
    if (messages.length) return messages.join("; ");
  }
  if (typeof err?.message === "string") return err.message;
  return fallback;
}
