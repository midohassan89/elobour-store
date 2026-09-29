import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#ff6a00",
          50: "#fff4eb",
          100: "#ffe4cc",
          200: "#ffc999",
          300: "#ffa55c",
          400: "#ff8529",
          500: "#ff6a00",
          600: "#e65f00",
          700: "#bf4e00",
          800: "#993e00",
          900: "#732f00",
        },
      },
    },
  },
};

export default config;
