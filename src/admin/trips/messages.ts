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
};

export const ERRORS: Record<string, string> = {
  "not-ready": "That language is not ready yet. The checklist below lists what is missing.",
  "not-found": "That trip no longer exists.",
  "no-translation": "That language has no translation yet.",
  "wrong-status": "That action is not available for the current status.",
  "has-published":
    "A language of this trip is published. Unpublish it first (publishing arrives in 7.4D).",
  failed: "Something went wrong. Please try again.",
};
