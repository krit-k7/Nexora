/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'zypher-bg': '#000000', // Pure Black
        'zypher-primary': '#ffffff', // Pure White
        'zypher-secondary': '#e5e5e5', // Neutral 200
        'zypher-accent': '#a3a3a3', // Neutral 400
        'zypher-navy': '#0a0a0a', // Near Black
      },
    },
  },
  plugins: [],
}