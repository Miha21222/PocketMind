/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pmblue: {
          700: "#1e5ea8",
          500: "#2f86dc",
        },
        pmgreen: {
          500: "#3baa84",
          200: "#d7f4e9",
        },
      },
      fontFamily: {
        sans: ["Nunito Sans", "Trebuchet MS", "Segoe UI", "sans-serif"],
      },
      borderRadius: {
        soft: "18px",
      },
      boxShadow: {
        card: "0 8px 24px rgba(23, 81, 138, 0.08)",
      },
    },
  },
  plugins: [],
};

