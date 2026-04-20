import fs from "fs";
import path from "path";
import { BASE_PATH, withBasePath } from "./base-path";
import type { WorkMetadataMap } from "./work-metadata";

export function getImagePathsFromDisk(): string[] {
  const imagesDir = path.join(process.cwd(), "public", "images");
  if (!fs.existsSync(imagesDir)) return [];
  const filenames = fs.readdirSync(imagesDir);
  return filenames
    .filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
    .map((f) => withBasePath(`/images/${f}`))
    .sort();
}

export function loadWorkMetadataFromDisk(): WorkMetadataMap {
  const metaPath = path.join(process.cwd(), "public", "work-metadata.json");
  if (!fs.existsSync(metaPath)) return {};
  try {
    const raw = fs.readFileSync(metaPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const map = parsed as WorkMetadataMap;
      if (!BASE_PATH) return map;
      const mapped: WorkMetadataMap = {};
      for (const [k, v] of Object.entries(map)) {
        mapped[withBasePath(k)] = v;
      }
      return mapped;
    }
  } catch {
    /* ignore malformed during dev */
  }
  return {};
}
