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
      .map((d) => {
        const msg = d?.msg?.replace(/^Value error,\s*/, "");
        if (!msg) return null;
        const field = Array.isArray(d?.loc) ? d.loc[d.loc.length - 1] : null;
        // Prefix the offending field name for per-field errors ("username: ..."),
        // but not for model-level validators whose loc is just ["body"] (e.g. the
        // capacity invariant) -- a "body:" prefix there is just noise.
        const useField = field && typeof field === "string" && field !== "body";
        return useField ? `${field}: ${msg}` : msg;
      })
      .filter(Boolean);
    if (messages.length) return messages.join("; ");
  }
  if (typeof err?.message === "string") return err.message;
  return fallback;
}
