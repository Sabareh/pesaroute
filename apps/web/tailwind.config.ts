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
        background: channel("background"),
        surface: channel("surface"),
        surfaceElevated: channel("surfaceElevated"),
        surfaceAlt: channel("surfaceAlt"),
        surfaceSubtle: channel("surfaceSubtle"),
        textPrimary: channel("textPrimary"),
        textSecondary: channel("textSecondary"),
        textTertiary: channel("textTertiary"),
        primary: channel("primary"),
        primaryDark: channel("primaryDark"),
        emerald: channel("emerald"),
        success: channel("success"),
        accent: channel("accent"),
        accentSoft: channel("accentSoft"),
        amber: channel("amber"),
        warning: channel("warning"),
        danger: channel("danger"),
        purpleAccent: channel("purpleAccent"),
        purple: channel("purple"),
        violet: channel("violet"),
        sky: channel("sky"),
        teal: channel("teal"),
        ink: channel("ink"),
        leaf: channel("leaf"),
        mint: channel("mint"),
        clay: channel("clay"),
        sunrise: channel("sunrise"),
        border: "var(--c-border)",
        borderStrong: "var(--c-borderStrong)",
        sidebar: channel("sidebarBg"),
        sidebarText: channel("sidebarText"),
        sidebarMuted: channel("sidebarMuted"),
        sidebarActive: channel("sidebarActive"),
        sidebarBorder: "var(--c-sidebarBorder)",
        bannerBg: channel("bannerBg"),
        bannerText: channel("bannerText"),
        bannerMuted: channel("bannerMuted")
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
