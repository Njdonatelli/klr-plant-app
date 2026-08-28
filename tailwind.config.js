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
          950: "#0d1f10",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: ["Fraunces", "Georgia", "Cambria", "Times New Roman", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(23 51 27 / 0.05), 0 1px 3px 0 rgb(23 51 27 / 0.06)",
        "card-hover":
          "0 4px 6px -1px rgb(23 51 27 / 0.08), 0 10px 20px -6px rgb(23 51 27 / 0.12)",
      },
    },
  },
  plugins: [],
};
