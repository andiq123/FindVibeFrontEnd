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
          primary: "#c4b5fd",
          secondary: "#a78bfa",
          accent: "#fbcfe8",
          neutral: "#6b7280",
          "base-100": "#1f2937",
          "base-200": "#374151",
          "base-300": "#4b5563",
          info: "#bae6fd",
          success: "#bbf7d0",
          warning: "#fef3c7",
          error: "#fecaca",
        },
      },
      "dark",
      "cupcake",
    ],
  },
};
