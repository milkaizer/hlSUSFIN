import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F7FB",
        ink: "#16213E",
        muted: "#5A6278",
        line: "#D9DDEA",
        azul: { DEFAULT: "#2443B8", deep: "#17307F", soft: "#E3E8FA" },
        azafran: { DEFAULT: "#E9A800", soft: "#FCF1CF" },
        ok: "#1F7A4D",
        warn: "#A3480E",
      },
      fontFamily: {
        sans: ["Pretendard Variable", "Pretendard", "-apple-system", "BlinkMacSystemFont", "Apple SD Gothic Neo", "Malgun Gothic", "sans-serif"],
      },
      maxWidth: { page: "72rem", prose: "40rem" },
      borderRadius: { tile: "6px" },
    },
  },
  plugins: [],
} satisfies Config;
