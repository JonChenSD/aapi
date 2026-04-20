"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Gallery lives on the home scene as an overlay; keep route for old links. */
export default function GalleryPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-sm text-white/60">
      Returning to scene…
    </div>
  );
}
