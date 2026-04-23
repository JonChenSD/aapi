import fs from "fs";
import path from "path";
import { BASE_PATH, withBasePath } from "./base-path";
import type { WorkMetadataMap } from "./work-metadata";

/** Shown first so the opening 8 slots always include these (see `getInitialIndices` in ImageCycle). */
const PRIORITY_SCENE_FILENAMES = [
  "DSC07456.jpg",
  "DSC07261.jpg",
  "DSC07213.jpg",
  "_DSF4937.jpg",
] as const;

function screenshot20260421Filename(filenames: string[]): string | undefined {
  return filenames.find(
    (f) =>
      /^Screenshot\s+2026-04-21\s+at\s+10\.28\.13\s+AM\.png$/i.test(
        f.replace(/[\u00A0\u202F\u2007\u2009]/g, " ")
      ) && f.toLowerCase().endsWith(".png")
  );
}

function toImagePath(filename: string): string {
  return withBasePath(`/images/${filename}`);
}

export function getImagePathsFromDisk(): string[] {
  const imagesDir = path.join(process.cwd(), "public", "images");
  if (!fs.existsSync(imagesDir)) return [];
  const filenames = fs.readdirSync(imagesDir).filter((f) => {
    if (!/\.(jpg|jpeg|png|webp|gif)$/i.test(f)) return false;
    const full = path.join(imagesDir, f);
    try {
      return fs.statSync(full).isFile();
    } catch {
      return false;
    }
  });

  const shot = screenshot20260421Filename(filenames);
  const priorityNames: string[] = [];
  priorityNames.push(PRIORITY_SCENE_FILENAMES[0]);
  if (shot) priorityNames.push(shot);
  for (let i = 1; i < PRIORITY_SCENE_FILENAMES.length; i++) {
    priorityNames.push(PRIORITY_SCENE_FILENAMES[i]);
  }

  const seen = new Set<string>();
  const priorityResolved: string[] = [];
  for (const name of priorityNames) {
    if (!filenames.includes(name) || seen.has(name)) continue;
    seen.add(name);
    priorityResolved.push(name);
  }

  const rest = filenames
    .filter((f) => !seen.has(f))
    .sort((a, b) => a.localeCompare(b));

  return [...priorityResolved.map(toImagePath), ...rest.map(toImagePath)];
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
