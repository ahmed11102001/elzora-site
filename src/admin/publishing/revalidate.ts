import "server-only";
import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { tagsForTrip } from "./tags";

/**
 * Makes a publish / unpublish / live edit visible on the public site without a redeploy.
 * updateTag (Next 16, Server Actions only) expires the tags immediately, so the dashboard user sees the
 * change on the very next page load. A failure here is logged, never thrown: the content is already saved
 * and the public cache expires on its own schedule.
 */
export function refreshPublicSite(tripId: string): void {
  try {
    for (const tag of tagsForTrip(tripId)) updateTag(tag);
    revalidatePath("/sitemap.xml");
  } catch (error) {
    console.error("public cache refresh failed", error instanceof Error ? error.message : error);
    // Outside a Server Action updateTag throws; fall back to stale-while-revalidate.
    try {
      for (const tag of tagsForTrip(tripId)) revalidateTag(tag, "max");
    } catch {
      /* nothing more to do */
    }
  }
}
