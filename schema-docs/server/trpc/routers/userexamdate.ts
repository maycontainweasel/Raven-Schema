import { z } from 'zod';
import { t } from '@schema/server/trpc/context';
import { RequestSchema } from '@schema';
import { Z_UserExamDate, RecordID_z } from '@schema/types';
import { userExamDateRouter as generatedUserExamDateRouter } from './generated/userexamdate';

const UserExamDateCreateInput = Z_UserExamDate.partial().merge(
  Z_UserExamDate.pick({
    u: true,
    exam: true,
    examDate: true,
  })
).merge(z.object({ parentId: z.union([z.string().min(1), z.number(), RecordID_z]) }));

const UserExamDateUpdateInput = z.union([
  z.object({
    id: z.union([z.string().min(1), z.number(), RecordID_z]),
    payload: Z_UserExamDate.omit({ id: true }).partial(),
  }),
  z.object({
    id: z.union([z.string().min(1), z.number(), RecordID_z]),
  }).merge(Z_UserExamDate.omit({ id: true }).partial()),
]);

const normalizeExamDate = (value: any) => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.valueOf()) ? value : parsed.toISOString();
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return value;
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.valueOf()) ? trimmed : parsed.toISOString();
  }
  return value;
};

const customUserExamDateRouter = t.router({
  create: t.procedure
    .input(RequestSchema(UserExamDateCreateInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const payload = input.data;
      if (!payload || !payload.parentId) {
        throw new Error('UserExamDate create payload is required (parentId missing)');
      }
      const normalizedPayload = {
        ...payload,
        examDate: normalizeExamDate(payload.examDate),
      };
      const query = /* surql */ `
        LET $parent = fn::ridParam('u', $parentId);
        LET $payload = fn::objectRemove($payload, ["parentId"]);
        RETURN fn::createUserExamDate($parent, $payload);
      `;
      const result = await LRS(await dbInstance.query(query, { payload: normalizedPayload, parentId: payload.parentId }));
      return result;
    }),
  update: t.procedure
    .input(RequestSchema(UserExamDateUpdateInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const data = input.data || {};
      let { id } = data as any;
      let payload = (data as any).payload;
      if (!payload) {
        const { id: _id, payload: _payload, ...rest } = data as any;
        payload = rest;
      }
      if (!id || !payload || Object.keys(payload).length === 0) {
        throw new Error('updateUserExamDate requires an id and payload');
      }
      if (id && typeof id === 'object') {
        id = (id as any).id ?? (id as any).value ?? id;
      }
      if (typeof id === 'string') {
        const trimmed = id.trim();
        const asNumber = Number(trimmed);
        id = trimmed !== '' && !Number.isNaN(asNumber) ? asNumber : trimmed;
      }
      const normalizedPayload = {
        ...payload,
        ...(payload.examDate !== undefined ? { examDate: normalizeExamDate(payload.examDate) } : {}),
      };
      const query = /* surql */ `
        RETURN fn::updateUserExamDate($id, $payload);
      `;
      const result = await LRS(await dbInstance.query(query, { id, payload: normalizedPayload }));
      return result;
    }),
});

export const userExamDateRouter = t.mergeRouters(generatedUserExamDateRouter, customUserExamDateRouter);
export type UserExamDateRouter = typeof userExamDateRouter;
