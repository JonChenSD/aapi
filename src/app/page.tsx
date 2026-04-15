import fs from "fs";
import path from "path";
import ClientScene from "./ClientScene";

function getImagePaths(): string[] {
  const imagesDir = path.join(process.cwd(), "public", "images");
  if (!fs.existsSync(imagesDir)) return [];
  const filenames = fs.readdirSync(imagesDir);
  return filenames
    .filter((f) => /\.(jpg|jpeg|png|webp|gif)$/i.test(f))
    .map((f) => `/images/${f}`);
}

export default function Home() {
  const images = getImagePaths();

  return (
    <div className="relative min-h-screen w-full bg-black">
      <ClientScene images={images} />
    </div>
  );
}
