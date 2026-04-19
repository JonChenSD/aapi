"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAmbientSynth } from "./useAmbientSynth";
import { ARP_INTERVAL_SECONDS, ADVANCE_EVERY_BEATS, SPAWN_CHORD_DURATION, IMAGE_HOLD_BEATS, IMAGE_FADE_BEATS } from "./useAmbientSynth";
import type { WorkMetadataMap } from "../lib/work-metadata";
import { VIEWPORT_EDGE_LEFT } from "@/lib/viewport-insets";
import GalleryOverlay, {
  type GalleryOverlayHandle,
} from "./GalleryOverlay";
import ImageCycle from "./ImageCycle";
import IntroOverlay from "./IntroOverlay";

type EntrancePhase = "intro" | "fading" | "bridging" | "live";

/** Time on black / rainbow thread after intro copy fades, before images are revealed. */
const ENTRANCE_BRIDGE_MS = 2800;

export default function ClientScene({
  images,
  workMetadata = {},
}: {
  images: string[];
  workMetadata?: WorkMetadataMap;
}) {
  const cursorRef = useRef<{ x: number; y: number }>({ x: 50, y: 50 });
  const [arpMuted, setArpMuted] = useState(false);
  const [spawnChordsMuted, setSpawnChordsMuted] = useState(false);
  const [padMuted, setPadMuted] = useState(false);
  const arpMutedRef = useRef(false);
  const spawnChordsMutedRef = useRef(false);
  const padMutedRef = useRef(false);

  useEffect(() => {
    arpMutedRef.current = arpMuted;
  }, [arpMuted]);
  useEffect(() => {
    spawnChordsMutedRef.current = spawnChordsMuted;
  }, [spawnChordsMuted]);
  useEffect(() => {
    padMutedRef.current = padMuted;
  }, [padMuted]);

  const { start, playSpawnChord } = useAmbientSynth({
    cursorRef,
    arpMutedRef,
    spawnChordsMutedRef,
    padMutedRef,
  });
  const [synthStarted, setSynthStarted] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [entrancePhase, setEntrancePhase] = useState<EntrancePhase>("intro");
  const galleryOverlayRef = useRef<GalleryOverlayHandle>(null);
  const galleryToggleRef = useRef<HTMLButtonElement>(null);
  const advanceScheduleRef = useRef<{ advanceNextSlot: (step: number) => void } | null>(null);
  const stepRef = useRef(0);
  const introStartedRef = useRef(false);

  const startWithNotify = useCallback(() => {
    start();
    setSynthStarted(true);
  }, [start]);

  useEffect(() => {
    if (!synthStarted) return;
    const intervalMs = ARP_INTERVAL_SECONDS * ADVANCE_EVERY_BEATS * 1000;
    const id = setInterval(() => {
      const step = stepRef.current;
      playSpawnChord(step);
      advanceScheduleRef.current?.advanceNextSlot(step);
      stepRef.current = step + 1;
    }, intervalMs);
    return () => clearInterval(id);
  }, [synthStarted, playSpawnChord]);

  useEffect(() => {
    if (entrancePhase !== "bridging") return;
    const id = window.setTimeout(() => setEntrancePhase("live"), ENTRANCE_BRIDGE_MS);
    return () => clearTimeout(id);
  }, [entrancePhase]);

  const handleIntroContinue = useCallback(() => {
    if (introStartedRef.current) return;
    introStartedRef.current = true;
    startWithNotify();
    setEntrancePhase("fading");
  }, [startWithNotify]);

  const showIntro = entrancePhase === "intro" || entrancePhase === "fading";
  const showScene = entrancePhase !== "intro";
  const showAudioMute =
    synthStarted &&
    entrancePhase !== "intro" &&
    entrancePhase !== "fading";

  const allAudioMuted = arpMuted && spawnChordsMuted && padMuted;

  const toggleAudioMute = useCallback(() => {
    const next = !allAudioMuted;
    setArpMuted(next);
    setSpawnChordsMuted(next);
    setPadMuted(next);
  }, [allAudioMuted]);

  return (
    <>
      {showIntro && (
        <IntroOverlay
          exiting={entrancePhase === "fading"}
          onContinue={handleIntroContinue}
          onFadeComplete={() => setEntrancePhase("bridging")}
        />
      )}
      {showAudioMute && (
        <>
          <button
            type="button"
            onClick={toggleAudioMute}
            className="intro-copy syne-mono pointer-events-auto fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-55 border-0 bg-transparent text-[clamp(0.7rem,1.85vw,0.8rem)] uppercase tracking-[0.055em] text-white/42 transition-colors hover:text-white/78 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/35"
            aria-pressed={allAudioMuted}
            aria-label={allAudioMuted ? "Unmute sound" : "Mute sound"}
          >
            {allAudioMuted ? "unmute" : "mute"}
          </button>
          <button
            ref={galleryToggleRef}
            type="button"
            onClick={() => {
              if (galleryOpen) {
                galleryOverlayRef.current?.requestClose();
              } else {
                setGalleryOpen(true);
              }
            }}
            aria-label={
              galleryOpen
                ? "Close gallery and return to scene"
                : "View works as a grid gallery"
            }
            aria-expanded={galleryOpen}
            aria-haspopup="dialog"
            className={`intro-copy syne-mono pointer-events-auto fixed top-[max(1rem,env(safe-area-inset-top))] max-w-[min(100vw-2rem,15rem)] border-0 bg-transparent p-0 text-left text-[clamp(0.7rem,1.85vw,0.8rem)] uppercase leading-snug tracking-[0.055em] text-white/42 transition-colors hover:text-white/78 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/35 ${
              galleryOpen ? "z-1010500" : "z-55"
            }`}
            style={{ left: VIEWPORT_EDGE_LEFT }}
          >
            {galleryOpen ? "back to scene" : "view as gallery"}
          </button>
        </>
      )}
      <GalleryOverlay
        ref={galleryOverlayRef}
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        images={images}
        workMetadata={workMetadata}
        chromeFocusRef={galleryToggleRef}
      />
      {showScene && (
        <ImageCycle
          images={images}
          workMetadata={workMetadata}
          entrancePhase={entrancePhase === "live" ? "live" : "entering"}
          entranceImageFadeMs={2200}
          onSpawnChord={() => playSpawnChord(stepRef.current)}
          syncToTempo={synthStarted}
          spawnChordDurationSeconds={SPAWN_CHORD_DURATION}
          imageCycleDurationSeconds={(IMAGE_HOLD_BEATS + IMAGE_FADE_BEATS) * ARP_INTERVAL_SECONDS}
          advanceScheduleRef={advanceScheduleRef}
          cursorSyncRef={cursorRef}
        />
      )}
    </>
  );
}
