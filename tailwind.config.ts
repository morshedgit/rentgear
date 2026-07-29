import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        // Earthy, outdoorsy palette
        pine: {
          50: "#f1f7f4",
          100: "#dcece3",
          200: "#bad9c9",
          300: "#8dbfa7",
          400: "#5c9f81",
          500: "#3d8264",
          600: "#2e684f",
          700: "#265340",
          800: "#204334",
          900: "#1b372c",
          950: "#0d1f18",
        },
        sand: {
          50: "#faf8f2",
          100: "#f2ecdc",
          200: "#e4d7b8",
          300: "#d3bd8b",
          400: "#c2a05f",
          500: "#b58a43",
          600: "#9e7137",
          700: "#82562f",
          800: "#6c472c",
          900: "#5b3d29",
        },
        ember: {
          500: "#e0662f",
          600: "#c9501e",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
