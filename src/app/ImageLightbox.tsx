"use client";

import { useEffect, useRef, useState } from "react";

/** Default: same band as `ImageCycle` focused lightbox. */
const DEFAULT_LIGHTBOX_Z = 1_000_000;
const LIGHTBOX_FADE_MS = 220;

const MAX_W = 1200;
const MAX_H = 900;
const PAD_VW = 6;
const PAD_VH = 5;

type ImageLightboxProps = {
  open: boolean;
  src: string | null;
  alt: string;
  onClose: () => void;
  /** Root stacking context; close control uses `zBase + 2`. */
  zBase?: number;
  /** When false, parent should handle Escape (e.g. combined gallery + lightbox). */
  closeOnEscape?: boolean;
};

export default function ImageLightbox({
  open,
  src,
  alt,
  onClose,
  zBase = DEFAULT_LIGHTBOX_Z,
  closeOnEscape = true,
}: ImageLightboxProps) {
  const closeZ = zBase + 2;
  const closeRef = useRef<HTMLButtonElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const prevOpenRef = useRef(false);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    if (!open || !src) {
      setReveal(false);
      return;
    }
    setReveal(false);
    const id = window.requestAnimationFrame(() => {
      setReveal(true);
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, src]);

  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, closeOnEscape]);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      prevFocusRef.current = document.activeElement as HTMLElement | null;
      requestAnimationFrame(() => closeRef.current?.focus());
    }
    if (!open && prevOpenRef.current) {
      const el = prevFocusRef.current;
      prevFocusRef.current = null;
      queueMicrotask(() => el?.focus?.());
    }
    prevOpenRef.current = open;
  }, [open]);

  if (!open || !src) return null;

  return (
    <div
      className="fixed inset-0"
      role="dialog"
      aria-modal="true"
      aria-label={`Enlarged view: ${alt}`}
      style={{
        zIndex: zBase,
        opacity: reveal ? 1 : 0,
        transition: `opacity ${LIGHTBOX_FADE_MS}ms ease-out`,
      }}
    >
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-default border-0 bg-black/55 p-0"
        aria-label="Close enlarged image"
        onClick={onClose}
      />
      <div
        role="presentation"
        className="fixed inset-0 z-10 flex cursor-default items-center justify-center px-[6vw] py-[5vh]"
        onClick={onClose}
      >
        <img
          src={src}
          alt={alt}
          className="pointer-events-auto object-contain object-center"
          style={{
            maxWidth: `min(${MAX_W}px, calc(100vw - ${PAD_VW * 2}vw))`,
            maxHeight: `min(${MAX_H}px, calc(100vh - ${PAD_VH * 2}vh))`,
          }}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div
        className="modal-close-slot pointer-events-none flex items-center justify-center"
        style={{ zIndex: closeZ }}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="close-btn-circle pointer-events-auto flex items-center justify-center rounded-full border border-white/70 text-white/90 transition-[width,height] duration-200 ease-out"
          style={{
            borderWidth: 1,
            width: 24,
            height: 24,
          }}
          aria-label="Close enlarged image"
        >
          <span className="close-fill" aria-hidden />
          <svg
            className="close-icon relative z-10"
            width={14}
            height={14}
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.25}
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M2 2l10 10M12 2L2 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
