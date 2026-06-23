import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        ink: "#172026",
        mist: "#eef3f6",
        coral: "#ef6a5b",
        teal: "#129b92",
        amber: "#f4b860"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(23, 32, 38, 0.12)"
      }
    }
  },
  plugins: []
} satisfies Config;
