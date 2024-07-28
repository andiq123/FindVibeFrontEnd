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
          primary: "#f97300",

          secondary: "#e2dfd0",

          accent: "#524c42",

          neutral: "#ff00ff",

          "base-100": "#32012f",

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
