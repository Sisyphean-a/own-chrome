/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        white: "#FDF6E3", // Beige / Paper
        black: "#2D2D2D", // Dark Charcoal / Ink (Softer)
        gray: {
          50: "#F5EFDC", // Warm Gray / Darker Paper
          100: "#EBE5CE",
          200: "#D6D0B8",
          300: "#C2BCA5",
          400: "#AFA992",
          500: "#9C9680",
          600: "#89836E",
          700: "#76705D",
          800: "#635D4C",
          900: "#504A3B",
        },
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
