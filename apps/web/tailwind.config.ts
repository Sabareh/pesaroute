import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#F6F5F0",
        surface: "#FFFFFF",
        surfaceElevated: "#FFFFFF",
        surfaceAlt: "#F0EFE9",
        surfaceSubtle: "#ECEAE2",
        textPrimary: "#11110F",
        textSecondary: "#5B5A55",
        textTertiary: "#85827A",
        border: "rgba(17,17,15,0.10)",
        borderStrong: "rgba(17,17,15,0.22)",
        primary: "#11110F",
        primaryDark: "#000000",
        emerald: "#2F6B4F",
        success: "#2F6B4F",
        amber: "#8D6A2E",
        warning: "#8D6A2E",
        danger: "#A33B32",
        purpleAccent: "#5B5A55",
        purple: "#5B5A55",
        teal: "#2F6B4F",
        ink: "#11110F",
        leaf: "#2F6B4F",
        mint: "#E8F0EA",
        clay: "#5B5A55",
        sunrise: "#8D6A2E"
      },
      boxShadow: {
        card: "0 1px 0 rgba(17, 17, 15, 0.04)",
        button: "none",
        soft: "0 16px 40px rgba(17, 17, 15, 0.08)",
        subtle: "0 1px 0 rgba(17, 17, 15, 0.04)"
      }
    }
  },
  plugins: []
};

export default config;
