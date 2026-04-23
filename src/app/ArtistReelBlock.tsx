"use client";

import { useState } from "react";
import type { Artist } from "./artists";

type Props = Pick<Artist, "reelVideoSrc" | "reelVideoPoster" | "reelVideoBox">;

const frameShell =
  "overflow-hidden rounded-xl border border-white/10 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-white/5";

const posterOverlayClass =
  "pointer-events-none absolute inset-0 z-[1] m-auto max-h-full max-w-full object-contain";

function ReelVideo({
  reelVideoSrc,
  reelVideoPoster,
  reelVideoBox,
  wideVideoClass,
  portraitVideoClass,
}: Props & { wideVideoClass: string; portraitVideoClass: string }) {
  const [hidePosterOverlay, setHidePosterOverlay] = useState(false);
  const preload = reelVideoPoster ? "auto" : "metadata";

  const video = (
    <video
      src={reelVideoSrc}
      poster={reelVideoPoster}
      controls
      playsInline
      preload={preload}
      className={
        reelVideoBox === "wide" ? wideVideoClass : `${portraitVideoClass} relative z-0`
      }
      onPlaying={() => setHidePosterOverlay(true)}
    />
  );

  if (!reelVideoPoster) {
    return reelVideoBox === "wide" ? (
      video
    ) : (
      <div className="relative grid w-full min-w-0 place-items-center">{video}</div>
    );
  }

  /* iOS often ignores `poster` on `<video>`; an img overlay matches the same asset until playback. */
  const overlay =
    !hidePosterOverlay ? (
      <img
        src={reelVideoPoster}
        alt=""
        className={posterOverlayClass}
        decoding="async"
        fetchPriority="high"
        aria-hidden
      />
    ) : null;

  if (reelVideoBox === "wide") {
    return (
      <div className="relative overflow-hidden rounded-lg bg-black">
        {video}
        {overlay}
      </div>
    );
  }

  return (
    <div className="relative grid w-full min-w-0 place-items-center overflow-hidden rounded-lg bg-black">
      {video}
      {overlay}
    </div>
  );
}

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

  const wideVideoClass = `relative z-0 m-0 block h-auto w-full bg-black object-contain ${maxHClass}`;
  const portraitVideoClass = `m-0 h-auto w-auto max-w-full bg-black object-contain ${maxHClass}`;

  return (
    <div className="w-full min-w-0">
      <div className={`min-w-0 ${frameShell}`}>
        <ReelVideo
          reelVideoSrc={reelVideoSrc}
          reelVideoPoster={reelVideoPoster}
          reelVideoBox={reelVideoBox}
          wideVideoClass={wideVideoClass}
          portraitVideoClass={portraitVideoClass}
        />
      </div>
    </div>
  );
}
