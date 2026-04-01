import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        night: "#070b1a",
        paper: "#f3f1eb",
        coral: "#ef8354",
        lagoon: "#3f88c5",
        moss: "#3f6c51"
      },
      boxShadow: {
        panel: "0 20px 40px rgba(2, 8, 24, 0.25)"
      }
    }
  },
  plugins: []
};

export default config;
