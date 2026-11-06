// Events store image ids, not addresses, so moving the images only changes
// VITE_IMAGES_URL. Production points it at the bucket's public URL; without it
// the Worker serves images from R2.
const base = (import.meta.env.VITE_IMAGES_URL || '/api/images').replace(/\/$/, '');

// The scenario preview has no bucket, so its uploads stay in the browser.
const local = new Map<string, string>();

export const imageUrl = (id: string) => local.get(id) ?? `${base}/${id}`;

export function keepLocalImage(file: File) {
  const id = crypto.randomUUID();
  local.set(id, URL.createObjectURL(file));
  return id;
}
