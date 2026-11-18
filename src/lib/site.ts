export const siteName = "ELZORA"; // working name, domain and final brand to be decided

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

/** Digits only, international format without "+" (e.g. 201000000000). Optional. */
export const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

export const allowIndexing = process.env.ALLOW_INDEXING === "true";
