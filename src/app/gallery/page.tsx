import { redirect } from "next/navigation";

/** Gallery lives on the home scene as an overlay; keep route for old links. */
export default function GalleryPage() {
  redirect("/");
}
