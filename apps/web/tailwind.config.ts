import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#F7F8FB",
        surface: "#FFFFFF",
        surfaceAlt: "#F1F4F9",
        textPrimary: "#0B1220",
        textSecondary: "#5B6472",
        border: "#E5EAF0",
        primary: "#2457FF",
        primaryDark: "#0B1B33",
        emerald: "#0FA36B",
        amber: "#F59E0B",
        danger: "#E5484D",
        purpleAccent: "#6D5DFB",
        ink: "#0B1220",
        leaf: "#0FA36B",
        mint: "#E9F8F1",
        clay: "#2457FF",
        sunrise: "#F59E0B"
      },
      boxShadow: {
        card: "0 8px 24px rgba(15, 23, 42, 0.06)",
        button: "0 12px 24px rgba(36, 87, 255, 0.18)",
        soft: "0 8px 24px rgba(15, 23, 42, 0.06)",
        subtle: "0 4px 16px rgba(15, 23, 42, 0.04)"
      }
    }
  },
  plugins: []
};

export default config;
