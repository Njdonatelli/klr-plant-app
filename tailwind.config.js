/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        klr: {
          50: "#f2f7f2",
          100: "#dfeade",
          200: "#c1d8c4",
          300: "#9cc0a1",
          400: "#6fa177",
          500: "#4d8456",
          600: "#2f6b3a",
          700: "#25532d",
          800: "#1e4224",
          900: "#17331b",
        },
      },
    },
  },
  plugins: [],
};
