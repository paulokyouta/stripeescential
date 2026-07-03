/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx}",
    "../backend/index.html",
  ],
  theme: {
    extend: {
      fontFamily: {
        "serif-display": ['"Playfair Display"', "Georgia", "serif"],
      },
      letterSpacing: {
        luxe: "0.15em",
      },
    },
  },
  plugins: [],
};
