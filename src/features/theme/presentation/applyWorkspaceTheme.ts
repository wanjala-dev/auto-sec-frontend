/**
 * Apply a workspace's resolved brand palette at runtime.
 *
 * The backend (`me/summary` → `workspace_context.theme`) sends the resolved,
 * WCAG-accessible token set as CSS channels (e.g. `"66 185 143"`). We inject a
 * <style id="workspace-theme"> element that overrides the BRAND CSS variables
 * declared in src/index.css. Only the seed-derived brand tokens are overridden;
 * neutrals + state stay at the Octopus defaults (they're mode-specific and not
 * workspace-controllable).
 *
 * Why a <style> element with BOTH `:root` and `html.dark` blocks (not inline
 * styles): `index.css` declares `html.dark { --primary: … }`, which out-
 * specifies `:root`. To win in dark mode too we must emit an `html.dark` block.
 * Brand tokens are mode-agnostic in our contract, so both blocks carry the same
 * values. Removing the element reverts cleanly to the Octopus defaults.
 *
 * Design: docs/plans/WORKSPACE_THEMING_DESIGN_2026-07-09.md
 */

const STYLE_ID = 'workspace-theme';

// The seed-derived tokens a workspace overrides. Keep in sync with the backend
// BrandResolutionService brand set and the FOUC script in public/index.html.
const BRAND_TOKENS = [
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'tertiary',
  'accent',
  'accent-foreground',
  'ring'
] as const;

type TokenMap = Record<string, string>;

export type WorkspaceThemePayload =
  | {
      mode?: string;
      logo_url?: string;
      light?: TokenMap;
      dark?: TokenMap;
      // Additive brand-kit keys (backend resolver): fixed logo slots and the
      // resolved font tokens. Fonts are consumed by applyBrandFonts, never by
      // the colour injection below.
      logos?: {
        primary?: string;
        icon?: string;
        dark?: string;
        favicon?: string;
      };
      fonts?: {
        heading?: { family?: string; stack?: string; google_family?: string };
        body?: { family?: string; stack?: string; google_family?: string };
      };
    }
  | null
  | undefined;

const buildCss = (tokens: TokenMap): string => {
  const lines = BRAND_TOKENS.filter((key) => tokens[key] != null)
    .map((key) => `  --${key}: ${tokens[key]};`)
    .join('\n');
  if (!lines) return '';
  // The brand tokens are mode-agnostic (same in light/dark), so ONE block
  // suffices. The repeated `:root:root:root` bumps specificity to (0,3,0) so it
  // beats index.css's `:root` (0,1,0) AND `html.dark` (0,1,1) regardless of DOM
  // load order — this <style> is injected before index.css loads, so equal
  // specificity would lose the cascade.
  return `:root:root:root {\n${lines}\n}\n`;
};

export const applyWorkspaceTheme = (theme: WorkspaceThemePayload): void => {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(STYLE_ID);
  // Brand tokens are identical in light/dark, so either map carries them.
  const tokens = theme?.light || theme?.dark;
  const css = theme && tokens ? buildCss(tokens) : '';
  if (!css) {
    if (existing) existing.remove();
    return;
  }
  const style =
    (existing as HTMLStyleElement) || document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css;
  if (!existing) document.head.appendChild(style);
};

export const extractWorkspaceTheme = (summary: any): WorkspaceThemePayload => {
  const ctx = summary?.workspace_context || summary?.data?.workspace_context;
  return ctx?.theme ?? null;
};

/**
 * Apply a pre-auth brand palette from the public `login-brand` endpoint.
 *
 * The login-brand payload only carries `primary`/`secondary` as space-separated
 * RGB channel strings (the same `--primary`/`--secondary` format the authed
 * theme uses), not the full resolved token set. We map those onto a
 * WorkspaceThemePayload and reuse the SAME high-specificity `:root:root:root`
 * injection as the authed path — no second injection mechanism. Foreground /
 * neutral tokens are intentionally left at the accessible Octopus defaults.
 *
 * Passing `null` (or a payload with no channels) removes the override, so the
 * auth screen reverts cleanly to the Octopus default.
 */
export const applyLoginBrandColors = (
  brand: { primary?: string; secondary?: string } | null | undefined
): void => {
  const tokens: TokenMap = {};
  if (brand?.primary) tokens.primary = brand.primary;
  if (brand?.secondary) tokens.secondary = brand.secondary;
  applyWorkspaceTheme(
    Object.keys(tokens).length ? { light: tokens, dark: tokens } : null
  );
};
