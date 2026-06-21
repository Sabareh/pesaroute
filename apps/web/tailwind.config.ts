import type { Config } from "tailwindcss";

// Tokens are backed by CSS variables defined in app/globals.css so the whole UI
// flips between light and dark with the OS/browser preference. Solid colours use
// the `rgb(var(--x) / <alpha-value>)` form so Tailwind alpha modifiers still work
// (e.g. bg-primary/40). Borders carry baked alpha and use the variable directly.
function channel(name: string) {
  return `rgb(var(--c-${name}) / <alpha-value>)`;
}

const config: Config = {
  // Class-based so the manual light/dark toggle (html.dark) drives theming.
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // --- 17 canonical MaliPrime Liquid tokens (prefer these in new code) ---
        page: channel("page"),
        surface: channel("surface"),
        surfaceSubtle: channel("surfaceSubtle"),
        ink: channel("ink"),
        ink2: channel("ink2"),
        ink3: channel("ink3"),
        primary: channel("primary"),
        primaryStrong: channel("primaryStrong"),
        accent: channel("accent"),
        greenSoft: channel("greenSoft"),
        warning: channel("warning"),
        danger: channel("danger"),
        info: channel("info"),
        violet: channel("violet"),
        surfaceInk: channel("surfaceInk"),
        border: "var(--c-border)",
        borderStrong: "var(--c-borderStrong)",
        // --- Legacy aliases (resolve to canonical tokens via CSS var()) ---
        background: channel("background"),
        surfaceElevated: channel("surfaceElevated"),
        surfaceAlt: channel("surfaceAlt"),
        textPrimary: channel("textPrimary"),
        textSecondary: channel("textSecondary"),
        textTertiary: channel("textTertiary"),
        primaryDark: channel("primaryDark"),
        emerald: channel("emerald"),
        success: channel("success"),
        accentSoft: channel("accentSoft"),
        amber: channel("amber"),
        purpleAccent: channel("purpleAccent"),
        purple: channel("purple"),
        sky: channel("sky"),
        teal: channel("teal"),
        leaf: channel("leaf"),
        mint: channel("mint"),
        clay: channel("clay"),
        sunrise: channel("sunrise"),
        // --- Dark-surface chrome (sidebar + banner) ---
        sidebar: channel("sidebarBg"),
        sidebarText: channel("sidebarText"),
        sidebarMuted: channel("sidebarMuted"),
        sidebarActive: channel("sidebarActive"),
        sidebarBorder: "var(--c-sidebarBorder)",
        bannerBg: channel("bannerBg"),
        bannerText: channel("bannerText"),
        bannerMuted: channel("bannerMuted")
      },
      // Radius scale: pill for actions & chips, card for cards/inputs/banners.
      borderRadius: {
        control: "10px", // small - tight insets, list rows, small controls
        card: "16px", // medium - cards, inputs, banners, modals
        panel: "22px", // large - hero & feature panels
        pill: "9999px" // buttons, chips, badges, toggles
      },
      // 7-step type scale (system font stack, weights 400/500/600).
      fontSize: {
        display: ["60px", { lineHeight: "1.05", letterSpacing: "-0.04em", fontWeight: "600" }],
        title: ["36px", { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "600" }],
        heading: ["24px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "600" }],
        subhead: ["18px", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "600" }],
        body: ["16px", { lineHeight: "1.6" }],
        small: ["14px", { lineHeight: "1.55" }],
        caption: ["12px", { lineHeight: "1.4", letterSpacing: "0.06em", fontWeight: "600" }]
      },
      boxShadow: {
        card: "var(--shadow-card)",
        button: "none",
        soft: "var(--shadow-soft)",
        subtle: "var(--shadow-subtle)"
      }
    }
  },
  plugins: []
};

export default config;
