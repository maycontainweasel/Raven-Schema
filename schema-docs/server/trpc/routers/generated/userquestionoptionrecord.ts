import { z } from 'zod';
import { t } from '@schema/server/trpc/context';

import { RequestSchema } from '@schema/request-schema';
import { Z_UserQuestionOptionRecord, RecordID_z } from '@schema/types';

const UserQuestionOptionRecordCreateInput = Z_UserQuestionOptionRecord.partial().merge(
  Z_UserQuestionOptionRecord.pick({
  u: true,
  qOption: true,
  })
).merge(z.object({ parentId: z.union([z.string().min(1), z.number()]) }));

const UserQuestionOptionRecordUpdateInput = z.union([
  z.object({
    id: z.union([z.string().min(1), z.number(), RecordID_z]),
    payload: Z_UserQuestionOptionRecord.omit({ id: true }).partial(),
  }),
  z.object({
    id: z.union([z.string().min(1), z.number(), RecordID_z]),
  }).merge(Z_UserQuestionOptionRecord.omit({ id: true }).partial()),
]);

const UserQuestionOptionRecordDeleteInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
});

const UserQuestionOptionRecordSubtableGetInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
});
const UserQuestionOptionRecordSubtableListInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
  start: z.number().optional(),
  limit: z.number().optional(),
});

export const userQuestionOptionRecordRouter = t.router({
  create: t.procedure
    .input(RequestSchema(UserQuestionOptionRecordCreateInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const payload = input.data;
      if (!payload || !payload.parentId) {
        throw new Error('UserQuestionOptionRecord create payload is required (parentId missing)');
      }
      const query = /* surql */ `
        LET $parent = type::record('qOption', $parentId);
        LET $payload = fn::objectRemove($payload, ["parentId"]);
        RETURN fn::createUserQuestionOptionRecord($parent, $payload);
      `;
      const result = await LRS(await dbInstance.query(query, { payload, parentId: payload.parentId }));
      return result;
    }),
  update: t.procedure
    .input(RequestSchema(UserQuestionOptionRecordUpdateInput))
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
        throw new Error('updateUserQuestionOptionRecord requires an id and payload');
      }
      if (id && typeof id === 'object') {
        id = (id as any).id ?? (id as any).value ?? id;
      }
      if (typeof id === 'string') {
        const trimmed = id.trim();
        const asNumber = Number(trimmed);
        id = trimmed !== '' && !Number.isNaN(asNumber) ? asNumber : trimmed;
      }
      const query = /* surql */ `
        RETURN fn::updateUserQuestionOptionRecord($id, $payload);
      `;
      const result = await LRS(await dbInstance.query(query, { id, payload }));
      return result;
    }),
  delete: t.procedure
    .input(RequestSchema(UserQuestionOptionRecordDeleteInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      let id = input.data?.id;
      if (!id) {
        throw new Error('deleteUserQuestionOptionRecord requires an id');
      }
      if (id && typeof id === 'object') {
        id = (id as any).id ?? (id as any).value ?? id;
      }
      if (typeof id === 'string') {
        const trimmed = id.trim();
        const asNumber = Number(trimmed);
        id = trimmed !== '' && !Number.isNaN(asNumber) ? asNumber : trimmed;
      }
      const query = /* surql */ `
        RETURN fn::deleteUserQuestionOptionRecord($id);
      `;
      const result = await LRS(await dbInstance.query(query, { id }));
      return result;
    }),
  get: t.procedure
    .input(RequestSchema(UserQuestionOptionRecordSubtableGetInput))
    .query(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const raw = input.data?.id;
      if (!raw) {
        throw new Error('subtable.get | id is required');
      }
      const query = /* surql */ `
        LET $subId = if type::is_record($id) {
          return record::id($id);
        } else if type::is_object($id) && $id.tb && $id.id {
          return $id.id;
        } else if type::is_string($id) {
          let $parts = string::split($id, ":");
          if array::len($parts) > 1 {
            return $parts[array::len($parts) - 1];
          };
          return $id;
        } else {
          return $id;
        };
        LET $RID = if type::is_string($subId) && string::matches($subId, '^-?\\d+$') {
          return type::record("uqor", <int> $subId);
        } else {
          return type::record("uqor", $subId);
        };
        RETURN SELECT * FROM only $RID;
      `;
      const result = await LRS(await dbInstance.query(query, { id: raw }));
      return result;
    }),
  list: t.procedure
    .input(RequestSchema(UserQuestionOptionRecordSubtableListInput))
    .query(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const id = input.data?.id;
      if (!id) {
        throw new Error('subtable.list | id is required');
      }
      const limit = typeof input.data?.limit === 'number' ? input.data.limit : -1;
      const start = typeof input.data?.start === 'number' ? input.data.start : -1;
      const params: Record<string, any> = { id };
      let query = /* surql */ `
        LET $RID = fn::ridParam("qOption", $id);
        RETURN SELECT * FROM uqor WHERE <-( UserQuestionOptionRecord WHERE in = $RID );
      `;
      if (limit >= 0) {
        query += ' LIMIT $limit';
        params.limit = limit;
      }
      if (start >= 0) {
        query += ' START $start';
        params.start = start;
      }
      query += ';';
      const result = await LRS(await dbInstance.query(query, params));
      return result;
    }),
});
