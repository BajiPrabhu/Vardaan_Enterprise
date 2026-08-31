// Turns an axios error into something worth showing a person, instead of
// every page re-deriving its own version of this. A 403 means the role
// genuinely can't do this — different from the backend being unreachable,
// which is different from a validation message the backend already wrote
// in plain language.
export function describeError(err, fallback = "Something went wrong.") {
  const status = err?.response?.status;

  if (status === 403) return "You don't have permission to do that.";
  if (!err?.response) return "Can't reach the backend — is it running?";

  return err.response.data?.error ?? fallback;
}
