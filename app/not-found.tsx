import Link from "next/link";
import "./globals.css";

// 로케일 밖 경로용 404. 자체 html 을 가진다
export default function GlobalNotFound() {
  return (
    <html lang="ko">
      <body className="flex min-h-screen items-center justify-center bg-paper p-6">
        <main className="max-w-md">
          <p className="text-[56px] font-extrabold leading-none text-azafran">404</p>
          <h1 className="mt-4 text-2xl font-extrabold">페이지를 찾을 수 없습니다.</h1>
          <p className="mt-2 text-muted">Page not found.</p>
          <Link href="/" className="btn-primary mt-6">홈으로</Link>
        </main>
      </body>
    </html>
  );
}
