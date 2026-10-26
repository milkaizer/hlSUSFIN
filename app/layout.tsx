import type { ReactNode } from "react";
import "./globals.css";

// 실제 <html> 은 app/[locale]/layout.tsx 에 있다
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
