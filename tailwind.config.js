/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        "glass-bg": "var(--glass-bg)",
        "glass-border": "var(--glass-border)",
      },
      backgroundImage: {
        'player-overlay': 'radial-gradient(circle at center, var(--player-gradient-start) 0%, var(--player-gradient-mid) 50%, var(--player-gradient-end) 100%)',
      }
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        vibenative: {
          primary: "#818cf8", // Lighter Indigo
          secondary: "#a855f7", // Purple accent
          accent: "#f472b6",
          neutral: "#1e293b",
          "base-100": "#0f172a", // Deep Slate
          "base-200": "#1e293b", // Slate Surface
          "base-300": "#334155", // Slate Card
          info: "#38bdf8",
          success: "#34d399",
          warning: "#fbbf24",
          error: "#f87171",
        },
      },
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
    ],
  },
};
