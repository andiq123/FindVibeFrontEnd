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
          primary: "#6366f1",
          secondary: "#312e81",
          accent: "#f472b6",
          neutral: "#1e293b",
          "base-100": "#111827",
          info: "#38bdf8",
          success: "#22c55e",
          warning: "#facc15",
          error: "#ef4444",
        },
      },
      "dark",
      "cupcake",
    ],
  },
};
