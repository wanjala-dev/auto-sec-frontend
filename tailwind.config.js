const plugin = require('tailwindcss/plugin');
const colors = require('tailwindcss/colors');

// This repo runs Tailwind v2, which does NOT substitute the v3 `<alpha-value>`
// placeholder. Brand/semantic tokens therefore use the opacity-callback form so
// opacity utilities (bg-primary/50, bg-opacity-50) keep working while the color
// resolves from a runtime-overridable CSS variable. Channels are space-separated
// in src/index.css; CSS Color 4 slash syntax `rgb(R G B / A)` is valid in all
// modern browsers. Design: docs/plans/WORKSPACE_THEMING_DESIGN_2026-07-09.md
const withVar =
  (v) =>
  ({ opacityVariable, opacityValue }) => {
    if (opacityValue !== undefined) return `rgb(var(${v}) / ${opacityValue})`;
    if (opacityVariable !== undefined)
      return `rgb(var(${v}) / var(${opacityVariable}, 1))`;
    return `rgb(var(${v}))`;
  };

module.exports = {
  // Content paths - Tailwind scans these files for class names
  // Best practice: Include all file types that might contain Tailwind classes
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
    './src/**/*.html'
  ],
  // Safelist any classes that are dynamically generated
  safelist: [
    // Add any dynamically generated class names here if needed
    // Example: 'bg-red-500', 'text-blue-600'
  ],

  // Dark mode configuration - using 'class' strategy for manual toggle
  // Best practice: Use 'class' for manual control, 'media' for system preference
  darkMode: 'class',

  theme: {
    extend: {
      screens: {
        sponsorSplit: '1340px'
      },
      transformOrigin: {
        0: '0%'
      },
      zIndex: {
        '-1': '-1'
      },
      colors: {
        emerald: colors.emerald,
        // Brand tokens — resolved from the CSS-variable contract in
        // src/index.css via withVar(). Channels equal the old hex, so this is a
        // zero-visual-change refactor; per-workspace themes override the vars
        // at runtime. Design: docs/plans/WORKSPACE_THEMING_DESIGN_2026-07-09.md
        brand: {
          primary: withVar('--primary'),
          secondary: withVar('--secondary'),
          tertiary: withVar('--tertiary')
        },
        primary: withVar('--primary'),
        secondary: withVar('--secondary'),
        tertiary: withVar('--tertiary'),
        tari: withVar('--tertiary'),
        // Semantic token contract (shadcn-style) — additive in Phase 1;
        // components migrate onto these (bg-card, text-muted-foreground,
        // ring-ring, …) in Phase 2. `border` is intentionally NOT redefined
        // here — the existing `border.{light,dark}` object is migrated in
        // Phase 2 to avoid changing the default border color app-wide.
        background: withVar('--background'),
        foreground: withVar('--foreground'),
        card: withVar('--card'),
        'card-foreground': withVar('--card-foreground'),
        popover: withVar('--popover'),
        'popover-foreground': withVar('--popover-foreground'),
        muted: withVar('--muted'),
        'muted-foreground': withVar('--muted-foreground'),
        'primary-foreground': withVar('--primary-foreground'),
        'secondary-foreground': withVar('--secondary-foreground'),
        accent: withVar('--accent'),
        'accent-foreground': withVar('--accent-foreground'),
        destructive: withVar('--destructive'),
        'destructive-foreground': withVar('--destructive-foreground'),
        ring: withVar('--ring'),
        input: withVar('--input'),
        neon: {
          violet: '#7C4DFF',
          cyan: '#2EDBE8'
        },
        surface: {
          light: '#FFFFFF',
          dark: '#1D1F2F',
          deep: '#050814',
          night: '#071021',
          deepest: '#020309'
        },
        text: {
          base: '#374557',
          muted: '#878F9A',
          inverted: '#FFFFFF'
        },
        border: {
          light: '#E5E5E5',
          dark: '#5356fb29'
        },
        overlay: 'rgba(0,0,0,0.2)',
        success: withVar('--success'),
        warning: withVar('--warning'),
        danger: withVar('--destructive'),
        // Auto-Sec HUD tokens — theme-aware (dark default, `.hud-light`
        // override). Support arbitrary alpha: bg-hud-surface/70,
        // border-hud-line/30, text-hud-accent, etc. See src/index.css.
        'hud-canvas': withVar('--hud-canvas'),
        'hud-surface': withVar('--hud-surface'),
        'hud-surface-2': withVar('--hud-surface-2'),
        'hud-text': withVar('--hud-text'),
        'hud-dim': withVar('--hud-dim'),
        'hud-line': withVar('--hud-line'),
        'hud-accent': withVar('--hud-accent'),
        // Legacy tokens (keep for existing classes)
        modalBackground: 'rgba(0,0,0,.20)',
        // Real Tailwind purple/pink palettes — for the `*-purple-<shade>` /
        // `*-pink-<shade>` usages. The legacy SCALAR `purple`/`pink` aliases
        // (remapped to green in the old NFT template) were misleading, so their
        // ~400 brand usages were migrated to the `primary` token instead.
        pink: colors.pink,
        purple: colors.purple,
        'light-gray': '#E5E5E5',
        // Muted/secondary text — theme-aware via CSS var (see src/index.css).
        // Light value is AA on white (4.77:1); was #858D98/#878F9A (~3.4:1).
        'thin-light-gray': 'var(--color-muted, #858D98)',
        'dark-gray': '#374557',
        'lighter-gray': 'var(--color-muted, #878F9A)',
        'light-purple': '#E3E4FE',
        gold: '#F2994A',
        'light-green': '#27AE60',
        'light-red': '#EB5757',
        'white-opacity': '#7B7EFC',
        'dark-white': '#1D1F2F',
        'dark-light-purple': '#5356fb29'
      },
      backgroundImage: {
        'brand-gradient':
          'linear-gradient(90deg, rgb(var(--primary)) 0%, rgb(var(--secondary)) 100%)',
        'brand-gradient-strong':
          'linear-gradient(90deg, rgb(var(--primary)) 0%, rgb(var(--tertiary)) 100%)',
        // Low-opacity variant for decorative borders that shouldn't shout.
        'brand-gradient-muted':
          'linear-gradient(90deg, rgb(var(--primary) / 0.35) 0%, rgb(var(--secondary) / 0.35) 100%)',
        'details-modal':
          'linear-gradient(135deg, #071021 0%, #050814 45%, #020309 100%)',
        // Canonical horizontal progress fill — yellow → green.
        // Use `bg-progress-fill` on any horizontal progress bar's fill div.
        'progress-fill': 'linear-gradient(90deg, #facc15 0%, #10b981 100%)',
        // Softer hero background for modal/card placeholders when no image.
        'hero-fill':
          'linear-gradient(135deg, #fde68a 0%, #bef264 45%, #10b981 100%)'
      },
      fontFamily: {
        sans: ['"Poppins"', 'system-ui', 'sans-serif'],
        heading: ['"Poppins"', 'sans-serif'],
        display: ['"SFDisplay"', 'system-ui', 'sans-serif'],
        accent: ['"BEYNO"', 'system-ui', 'sans-serif'],
        brand: ['"Bauhaus"', 'system-ui', 'sans-serif']
      },
      fontSize: {
        18: '18px',
        26: ['26px', { lineHeight: '31.54px' }]
      },
      boxShadow: {
        'details-modal': '0 15px 50px rgba(5, 8, 20, 0.65)'
      },
      keyframes: {
        'orbit-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        'orbit-mid': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        'orbit-fast': {
          '0%': { transform: 'rotate(360deg)' },
          '100%': { transform: 'rotate(0deg)' }
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' }
        },
        'mesh-fade': {
          '0%, 100%': { opacity: '0.15' },
          '50%': { opacity: '0.35' }
        }
      },
      animation: {
        'orbit-slow': 'orbit-slow 60s linear infinite',
        'orbit-mid': 'orbit-mid 45s linear infinite',
        'orbit-fast': 'orbit-fast 30s linear infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        'mesh-fade': 'mesh-fade 4s ease-in-out infinite'
      }
    }
  },

  // (The v2 `variants` key was removed in the Tailwind v3 upgrade — v3's JIT
  // engine enables all variants by default, so hover/focus/focus-within/dark
  // for every utility are available without opt-in.)

  // Plugins
  plugins: [
    // Custom component plugin
    plugin(function ({ addComponents, theme }) {
      const buttons = {
        '.btn-red': {
          padding: '.5rem 1rem',
          borderRadius: '.25rem',
          fontWeight: '600',
          backgroundColor: '#e3342f',
          color: '#fff',
          '&:hover': {
            backgroundColor: '#cc1f1a'
          },
          // Add dark mode support
          '.dark &': {
            backgroundColor: '#c53030',
            '&:hover': {
              backgroundColor: '#9b2c2c'
            }
          }
        }
      };

      addComponents(buttons);
    }),
    // Forms plugin for better form styling
    require('./config/tailwindFormsCompat')
  ],

  // Core plugins configuration (optional)
  // Best practice: Disable unused core plugins to reduce CSS size
  corePlugins: {
    // Uncomment to disable specific core plugins if not used
    // preflight: false, // Disable Tailwind's base styles
  }
};
