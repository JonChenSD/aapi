"use client";

import type { Artist } from "./artists";

type Props = Pick<Artist, "reelVideoSrc" | "reelVideoPoster" | "reelVideoBox">;

const frameShell =
  "overflow-hidden rounded-xl border border-white/10 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-white/5";

export default function ArtistReelBlock({
  reelVideoSrc,
  reelVideoPoster,
  reelVideoBox = "portrait",
}: Props) {
  if (!reelVideoSrc) return null;

  const maxHClass =
    reelVideoBox === "wide"
      ? "max-h-[min(52dvh,520px)]"
      : "max-h-[min(70dvh,600px)]";

  const wideVideoClass = `m-0 block h-auto w-full bg-black object-contain ${maxHClass}`;
  const portraitVideoClass = `m-0 h-auto w-auto max-w-full bg-black object-contain ${maxHClass}`;

  return (
    <div className="w-full min-w-0">
      <div className={`min-w-0 ${frameShell}`}>
        {reelVideoBox === "wide" ? (
          <div className="overflow-hidden rounded-lg bg-black">
            <video
              src={reelVideoSrc}
              poster={reelVideoPoster}
              controls
              playsInline
              preload="metadata"
              className={wideVideoClass}
            />
          </div>
        ) : (
          <div className="grid w-full min-w-0 place-items-center overflow-hidden rounded-lg bg-black">
            <video
              src={reelVideoSrc}
              poster={reelVideoPoster}
              controls
              playsInline
              preload="metadata"
              className={portraitVideoClass}
            />
          </div>
        )}
      </div>
    </div>
  );
}
