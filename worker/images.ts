import { type Context, Hono } from 'hono';
import { validator } from 'hono-openapi';
import { z } from 'zod';
import { MAX_IMAGE_BYTES } from '../src/domain/rules';
import { readAccount } from './accounts';
import {
  type ApiEnv,
  ApiError,
  actorId,
  idSchema,
  operation,
  requireStaff,
  validationHook,
} from './http';

// Reads the type from the file's first bytes, so a renamed file can't pass as an image.
export function imageType(bytes: Uint8Array) {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && ascii(1, 8) === 'PNG\r\n\x1a\n') return 'image/png';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a') return 'image/gif';
  return null;
}

export const imageRoutes = new Hono<ApiEnv>().post(
  '/staff/images',
  operation('Upload a JPEG, PNG, WebP or GIF image of up to 5 MB'),
  // Checks staff access before parsing the body.
  async (c, next) => {
    requireStaff(await readAccount(c.var.db, await actorId(c)));
    await next();
  },
  validator('form', z.object({ file: z.file() }), validationHook),
  async (c) => {
    const { file } = c.req.valid('form');
    if (file.size > MAX_IMAGE_BYTES) throw new ApiError(413, 'Images can be up to 5 MB.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const contentType = imageType(bytes);
    if (!contentType) throw new ApiError(415, 'Choose a JPEG, PNG, WebP or GIF image.');
    const id = crypto.randomUUID();
    // An id always names the same image, so browsers may keep it for a year.
    await c.env.IMAGES.put(id, bytes, {
      httpMetadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' },
    });
    return c.json({ ok: true, message: 'Image uploaded.', id });
  },
);

// Production serves images from the bucket's public URL. This route serves them
// locally, in tests, and whenever VITE_IMAGES_URL is unset.
export async function serveImage(c: Context<ApiEnv>) {
  const id = c.req.param('imageId') ?? '';
  const object = idSchema.safeParse(id).success ? await c.env.IMAGES.get(id) : null;
  if (!object) return c.json({ ok: false, message: 'Image unavailable' }, 404);
  const headers = new Headers({ ETag: object.httpEtag, 'X-Content-Type-Options': 'nosniff' });
  object.writeHttpMetadata(headers);
  return new Response(object.body, { headers });
}
