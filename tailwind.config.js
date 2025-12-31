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
        "player-overlay":
          "radial-gradient(circle at center, var(--player-gradient-start) 0%, var(--player-gradient-mid) 50%, var(--player-gradient-end) 100%)",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        // Ocean Breeze - Fresh Blue & Teal
        vibenative: {
          primary: "#06b6d4", // Vibrant Cyan
          secondary: "#14b8a6", // Teal
          accent: "#f59e0b", // Warm Amber
          neutral: "#475569",
          "base-100": "#0c1222", // Deep navy
          "base-200": "#1e293b", // Navy slate
          "base-300": "#334155", // Lighter navy
          "base-content": "#f1f5f9", // Bright text
          info: "#3b82f6",
          success: "#10b981",
          warning: "#f59e0b",
          error: "#ef4444",
          "--rounded-box": "1.5rem",
          "--rounded-btn": "1rem",
        },
      },
    ],
  },
};
