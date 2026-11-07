import { asc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { validator } from 'hono-openapi';
import { z } from 'zod';
import { templateSchema } from '../src/domain/reviewForm';
import { readAccount } from './accounts';
import { reviewTemplates } from './db/schema';
import {
  type ApiEnv,
  ApiError,
  actorId,
  idSchema,
  operation,
  requireStaff,
  validationHook,
} from './http';

const templateDto = templateSchema.extend({ id: idSchema });
const templateParams = validator('param', z.object({ templateId: idSchema }), validationHook);
const templateBody = validator('json', templateSchema, validationHook);
const missing = () => new ApiError(404, 'This template is unavailable.');
const columns = { id: reviewTemplates.id, name: reviewTemplates.name, form: reviewTemplates.form };

export const templateRoutes = new Hono<ApiEnv>()
  .get('/staff/templates', operation('List review templates', z.array(templateDto)), async (c) => {
    requireStaff(await readAccount(c.var.db, await actorId(c)));
    const rows = await c.var.db
      .select(columns)
      .from(reviewTemplates)
      .orderBy(asc(reviewTemplates.name));
    return c.json(rows);
  })
  .post('/staff/templates', operation('Create a review template'), templateBody, async (c) => {
    requireStaff(await readAccount(c.var.db, await actorId(c)));
    const [created] = await c.var.db
      .insert(reviewTemplates)
      .values(c.req.valid('json'))
      .returning({ id: reviewTemplates.id });
    return c.json({ ok: true, message: 'Template saved.', id: created.id });
  })
  .get(
    '/staff/templates/:templateId',
    operation('Read a review template', templateDto),
    templateParams,
    async (c) => {
      requireStaff(await readAccount(c.var.db, await actorId(c)));
      const [row] = await c.var.db
        .select(columns)
        .from(reviewTemplates)
        .where(eq(reviewTemplates.id, c.req.valid('param').templateId));
      if (!row) throw missing();
      return c.json(row);
    },
  )
  .patch(
    '/staff/templates/:templateId',
    operation('Replace a review template. Events keep the copies they already have.'),
    templateParams,
    templateBody,
    async (c) => {
      requireStaff(await readAccount(c.var.db, await actorId(c)));
      const { templateId } = c.req.valid('param');
      const [saved] = await c.var.db
        .update(reviewTemplates)
        .set({ ...c.req.valid('json'), updatedAt: new Date().toISOString() })
        .where(eq(reviewTemplates.id, templateId))
        .returning({ id: reviewTemplates.id });
      if (!saved) throw missing();
      return c.json({ ok: true, message: 'Template saved.', id: templateId });
    },
  )
  .delete(
    '/staff/templates/:templateId',
    operation('Delete a review template. Events keep the copies they already have.'),
    templateParams,
    async (c) => {
      requireStaff(await readAccount(c.var.db, await actorId(c)));
      const [deleted] = await c.var.db
        .delete(reviewTemplates)
        .where(eq(reviewTemplates.id, c.req.valid('param').templateId))
        .returning({ id: reviewTemplates.id });
      if (!deleted) throw missing();
      return c.json({ ok: true, message: 'Template deleted. Events keep their copies.' });
    },
  );
