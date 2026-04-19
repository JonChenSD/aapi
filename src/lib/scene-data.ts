import fs from "fs";
import path from "path";
import type { WorkMetadataMap } from "./work-metadata";

export function getImagePathsFromDisk(): string[] {
  const imagesDir = path.join(process.cwd(), "public", "images");
  if (!fs.existsSync(imagesDir)) return [];
  const filenames = fs.readdirSync(imagesDir);
  return filenames
    .filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
    .map((f) => `/images/${f}`)
    .sort();
}

export function loadWorkMetadataFromDisk(): WorkMetadataMap {
  const metaPath = path.join(process.cwd(), "public", "work-metadata.json");
  if (!fs.existsSync(metaPath)) return {};
  try {
    const raw = fs.readFileSync(metaPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as WorkMetadataMap;
    }
  } catch {
    /* ignore malformed during dev */
  }
  return {};
}
