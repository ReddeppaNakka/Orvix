/**
 * Best-effort logo URL for a card. If the technology has an explicit image_url we use
 * it; otherwise we derive a favicon from its homepage. Returns null when neither is
 * available, so the card falls back to a monogram tile.
 */
export function logoFor(imageUrl: string | null, homepageUrl: string | null): string | null {
  if (imageUrl) return imageUrl;
  if (!homepageUrl) return null;
  try {
    const host = new URL(homepageUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
  } catch {
    return null;
  }
}
