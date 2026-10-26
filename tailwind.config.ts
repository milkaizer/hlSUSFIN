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
      // tile: 실무 UI(관리자, My Class). card: 공개 페이지 쇼케이스 카드. pill: 보조 알약 버튼
      borderRadius: { tile: "6px", card: "24px", pill: "9999px" },
      boxShadow: { hairline: "0 1px 0 rgba(0,0,0,0.05)" },
    },
  },
  plugins: [],
} satisfies Config;
