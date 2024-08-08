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
          primary: "#2f2b3a",

          secondary: "#46424f",

          accent: "#5e5a66",

          neutral: "#ff00ff",

          "base-100": "#1a1625",

          info: "#00ffff",

          success: "#00ff00",

          warning: "#00ff00",

          error: "#ff0000",
        },
      },
      "dark",
      "cupcake",
    ],
  },
};
