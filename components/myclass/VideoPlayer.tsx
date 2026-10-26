import { isVideoId } from "@/lib/validate";
import { Watermark } from "./Watermark";

// 16:9 플레이어 + 이메일 워터마크. 영상 ID 는 형식 검사 후에만 임베드 (9.6)
export function VideoPlayer({ provider, videoId, title, watermark, emptyText }: {
  provider: string; videoId: string | null; title: string; watermark: string; emptyText: string;
}) {
  const ok = isVideoId(videoId) && (provider === "youtube" || (provider === "vimeo" && /^\d+$/.test(videoId)));
  const src = !ok ? null
    : provider === "vimeo"
      ? `https://player.vimeo.com/video/${videoId}?dnt=1`
      : `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-tile bg-ink">
      {src ? (
        <iframe src={src} title={title} className="absolute inset-0 h-full w-full" loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      ) : (
        <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-white/80">{emptyText}</p>
      )}
      <Watermark text={watermark} />
    </div>
  );
}
