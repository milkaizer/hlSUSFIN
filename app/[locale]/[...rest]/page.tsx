import { notFound } from "next/navigation";

// 로케일 안의 없는 경로는 로케일 레이아웃과 함께 404
export default function CatchAll() {
  notFound();
}
