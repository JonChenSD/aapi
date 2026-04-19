"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { WorkMetadataMap } from "../lib/work-metadata";
import { workImageAlt } from "../lib/work-metadata";
import { getArtistById } from "./artists";
import ImageLightbox from "./ImageLightbox";

/** Above `ImageCycle` focused image (`~1e6`), below nested `ImageLightbox` in this overlay. */
const GALLERY_SHELL_Z = 1_010_000;
const GALLERY_LIGHTBOX_Z = 1_020_000;

const SHELL_OPACITY_MS = 480;

export type GalleryOverlayHandle = {
  /** Starts the opacity exit; `onClose` runs when the fade finishes. */
  requestClose: () => void;
};

type GalleryOverlayProps = {
  open: boolean;
  onClose: () => void;
  images: string[];
  workMetadata: WorkMetadataMap;
  /** Receives focus after the overlay has faded in (same control as “view as gallery”). */
  chromeFocusRef?: React.RefObject<HTMLButtonElement | null>;
};

const GalleryOverlay = forwardRef<GalleryOverlayHandle, GalleryOverlayProps>(
  function GalleryOverlay(
    { open, onClose, images, workMetadata, chromeFocusRef },
    ref
  ) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [shellEntered, setShellEntered] = useState(false);
    const [exiting, setExiting] = useState(false);
    const openIndexRef = useRef<number | null>(null);
    const prevFocusRef = useRef<HTMLElement | null>(null);
    const prevOverlayOpenRef = useRef(false);

    openIndexRef.current = openIndex;

    const beginExit = useCallback(() => {
      if (exiting) return;
      setOpenIndex(null);
      setExiting(true);
    }, [exiting]);

    const beginExitRef = useRef(beginExit);
    beginExitRef.current = beginExit;

    useImperativeHandle(ref, () => ({
      requestClose: () => beginExitRef.current(),
    }));

    useEffect(() => {
      if (!open) {
        setOpenIndex(null);
        setExiting(false);
        setShellEntered(false);
        return;
      }
      setShellEntered(false);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setShellEntered(true));
      });
      return () => cancelAnimationFrame(id);
    }, [open]);

    useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key !== "Escape") return;
        if (openIndexRef.current !== null) {
          setOpenIndex(null);
        } else {
          beginExitRef.current();
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    useEffect(() => {
      if (open && !prevOverlayOpenRef.current) {
        prevFocusRef.current = document.activeElement as HTMLElement | null;
      }
      if (!open && prevOverlayOpenRef.current) {
        const el = prevFocusRef.current;
        prevFocusRef.current = null;
        queueMicrotask(() => el?.focus?.());
      }
      prevOverlayOpenRef.current = open;
    }, [open]);

    useEffect(() => {
      if (!open || !shellEntered || exiting) return;
      requestAnimationFrame(() => chromeFocusRef?.current?.focus());
    }, [open, shellEntered, exiting, chromeFocusRef]);

    const alts = useMemo(
      () =>
        images.map((src, i) =>
          workImageAlt(src, workMetadata, i, (id) => getArtistById(id)?.name)
        ),
      [images, workMetadata]
    );

    const handleShellTransitionEnd = (
      e: React.TransitionEvent<HTMLDivElement>
    ) => {
      if (e.target !== e.currentTarget) return;
      if (e.propertyName !== "opacity") return;
      if (!exiting) return;
      onClose();
    };

    const thumbLightboxOpen = openIndex !== null;
    const src = thumbLightboxOpen ? images[openIndex]! : null;
    const alt = thumbLightboxOpen ? alts[openIndex]! : "";

    if (!open) return null;

    const shellOpaque = shellEntered && !exiting;

    return (
      <div
        className={`fixed inset-0 flex min-h-0 min-w-0 cursor-auto flex-col bg-black/96 text-white backdrop-blur-sm transition-opacity ease-in-out ${
          shellOpaque ? "opacity-100" : "opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Artwork grid"
        style={{
          zIndex: GALLERY_SHELL_Z,
          transitionDuration: `${SHELL_OPACITY_MS}ms`,
        }}
        onTransitionEnd={handleShellTransitionEnd}
      >
        <div className="relative box-border min-h-0 min-w-0 flex-1 overflow-hidden pl-[env(safe-area-inset-left)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <main className="gallery-scroll-area absolute inset-0 box-border overflow-x-hidden overflow-y-auto overscroll-contain">
            <ul className="m-0 grid min-h-0 w-full min-w-0 list-none grid-cols-2 gap-0 p-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {images.map((imageSrc, i) => (
                <li
                  key={imageSrc}
                  className="box-content aspect-square min-h-0 min-w-0 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(i)}
                    className="relative flex h-full min-h-0 w-full cursor-pointer flex-col overflow-hidden border-0 bg-black p-0 leading-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white/55"
                    aria-label={`Open ${alts[i]}`}
                    aria-haspopup="dialog"
                    aria-expanded={openIndex === i}
                  >
                    <img
                      src={imageSrc}
                      alt=""
                      className="block min-h-0 w-full flex-1 object-cover"
                      draggable={false}
                    />
                    <span className="sr-only">{alts[i]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </main>
        </div>

        <ImageLightbox
          open={thumbLightboxOpen}
          src={src}
          alt={alt}
          onClose={() => setOpenIndex(null)}
          zBase={GALLERY_LIGHTBOX_Z}
          closeOnEscape={false}
        />
      </div>
    );
  }
);

GalleryOverlay.displayName = "GalleryOverlay";

export default GalleryOverlay;
