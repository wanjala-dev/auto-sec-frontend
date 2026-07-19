// Shared email validation — the ONE place email format is checked on the
// frontend. Reuse `isValidEmail` everywhere (auth, invites, contact forms)
// instead of hand-rolling a regex in a component. Ported from literacyseed
// (typo fixed), kept as the canonical shared validator alongside uuidValidation.
const EMAIL_RE = /^[ ]*([^@\s]+)@((?:[-a-z0-9]+\.)+[a-z]{2,})[ ]*$/i;

/** Pure predicate — true for a well-formed (or empty) email. */
export const isValidEmail = (email) =>
  !email || EMAIL_RE.test(String(email));

/**
 * Callback form (matches the literacyseed usage): sets `{ error }` on the
 * provided setter. Prefer `isValidEmail` in new code.
 */
export const validateEmail = (email, setError) => {
  if (email === '' || email == null) return;
  setError({ error: EMAIL_RE.test(String(email)) ? '' : 'Invalid email' });
};
