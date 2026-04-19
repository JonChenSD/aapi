import ClientScene from "./ClientScene";
import {
  getImagePathsFromDisk,
  loadWorkMetadataFromDisk,
} from "../lib/scene-data";

export default function Home() {
  const images = getImagePathsFromDisk();
  const workMetadata = loadWorkMetadataFromDisk();

  return (
    <div className="relative min-h-screen w-full bg-black">
      <ClientScene images={images} workMetadata={workMetadata} />
    </div>
  );
}
