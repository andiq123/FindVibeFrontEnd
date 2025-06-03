/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        mytheme: {
          primary: "#b89afc",
          secondary: "#a78bfa",
          accent: "#f472b6",
          neutral: "#6b7280",
          "base-100": "#1e1b4b",
          "base-200": "#312e81",
          "base-300": "#4338ca",
          info: "#38bdf8",
          success: "#34d399",
          warning: "#fbbf24",
          error: "#f87171",
        },
      },
      "dark",
      "cupcake",
    ],
  },
};
