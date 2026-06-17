/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: "#2D6A4F",
        secondary: "#40916C",
        accent: "#74C69D",
        soil: "#8B5A2B",
        sunshine: "#F4D35E",
        cream: "#FAF8F5",
      },
      fontFamily: {
        heading: ["'Noto Serif SC'", "serif"],
        body: ["'Noto Sans SC'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
