import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#15221d",
        leaf: "#0f7b5f",
        mint: "#dff5ec",
        clay: "#c86f3c",
        sunrise: "#f6c85f"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(21, 34, 29, 0.16)"
      }
    }
  },
  plugins: []
};

export default config;
