// Routes an auth screen is allowed to return to after sign-in/up. Keeps a
// `returnTo` query param from being used as an arbitrary/open navigation target
// — only known internal destinations pass; anything else falls back to "/".
const ALLOWED_RETURN_PREFIXES = ["/paywall"];

/**
 * Validate a `returnTo` param against the allowlist. Accepts an exact allowed
 * path or one with a query string (e.g. `/paywall?source=x&resume=1`); returns
 * the safe destination, or "/" when it isn't recognised.
 */
export const safeReturnTo = (
  returnTo: string | string[] | undefined,
): string => {
  const value = Array.isArray(returnTo) ? returnTo[0] : returnTo;
  if (
    typeof value === "string" &&
    ALLOWED_RETURN_PREFIXES.some(
      (p) => value === p || value.startsWith(`${p}?`),
    )
  ) {
    return value;
  }
  return "/";
};
