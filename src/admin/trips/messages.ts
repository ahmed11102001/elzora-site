// Notices shown after a trip action. Actions redirect with a short code, never with free text, so a
// crafted link cannot put arbitrary words on the page.
export const NOTICES: Record<string, string> = {
  saved: "Saved.",
  created: "Trip created. Add the details below, then submit it for review.",
  duplicated: "Copy created. Give each language its own slug before submitting it.",
  review: "Submitted for review.",
  draft: "Moved back to draft.",
  archived: "Trip archived.",
  restored: "Trip restored.",
  deleted: "Trip deleted.",
  published: "Published. The public page is updated; no redeploy needed.",
  unpublished: "Unpublished and moved back to draft. It is no longer on the public site.",
};

export const ERRORS: Record<string, string> = {
  "not-ready": "That language is not ready yet. The checklist below lists what is missing.",
  "not-found": "That trip no longer exists.",
  "no-translation": "That language has no translation yet.",
  "wrong-status": "That action is not available for the current status.",
  "has-published": "A language of this trip is published. Unpublish it first.",
  archived: "Restore the trip before publishing it.",
  "slug-conflict": "Another trip took that slug a moment ago. Change the slug and try again.",
  "no-slug": "Add a URL slug first: the preview needs a page address.",
  "preview-off":
    "Preview is not set up: set PREVIEW_SECRET (16+ characters) on the server and the public site.",
  failed: "Something went wrong. Please try again.",
};
