// 스페이서 플래그 (10.6). 빌드 시 고정되므로 바꾸면 재빌드
export const flags = {
  showResults: process.env.NEXT_PUBLIC_SHOW_RESULTS === "true",
  showReviews: process.env.NEXT_PUBLIC_SHOW_REVIEWS === "true",
};
