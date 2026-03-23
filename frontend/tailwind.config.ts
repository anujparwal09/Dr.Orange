import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        playfair: ["var(--font-playfair)"],
        dm: ["var(--font-dm)"],
        mono: ["var(--font-mono)"],
      },
      colors: {
        orange: {
          primary: "#FF8C00",
          red: "#FF4500",
          amber: "#FFB347",
        },
        cream: "#FAF5E4",
        muted: "#8A7F70",
        green: "#2D8A4E",
        bg: "#070707",
        bg2: "#0d0d0d",
      },
    },
  },
  plugins: [],
};

export default config;
