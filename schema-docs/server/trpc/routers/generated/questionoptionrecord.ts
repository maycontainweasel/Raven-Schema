import { z } from 'zod';
import { t } from '@schema/server/trpc/context';

import { RequestSchema } from '@schema/request-schema';
import { Z_QuestionOptionRecord, RecordID_z } from '@schema/types';

const QuestionOptionRecordCreateInput = Z_QuestionOptionRecord.partial().merge(
  Z_QuestionOptionRecord.pick({
  q: true,
  qOption: true,
  })
).merge(z.object({ parentId: z.union([z.string().min(1), z.number()]) }));

const QuestionOptionRecordUpdateInput = z.union([
  z.object({
    id: z.union([z.string().min(1), z.number(), RecordID_z]),
    payload: Z_QuestionOptionRecord.omit({ id: true }).partial(),
  }),
  z.object({
    id: z.union([z.string().min(1), z.number(), RecordID_z]),
  }).merge(Z_QuestionOptionRecord.omit({ id: true }).partial()),
]);

const QuestionOptionRecordDeleteInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
});

const QuestionOptionRecordSubtableGetInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
});

export const questionOptionRecordRouter = t.router({
  create: t.procedure
    .input(RequestSchema(QuestionOptionRecordCreateInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const payload = input.data;
      if (!payload || !payload.parentId) {
        throw new Error('QuestionOptionRecord create payload is required (parentId missing)');
      }
      const query = /* surql */ `
        LET $parent = type::record('qOption', $parentId);
        LET $payload = fn::objectRemove($payload, ["parentId"]);
        RETURN fn::createQuestionOptionRecord($parent, $payload);
      `;
      const result = await LRS(await dbInstance.query(query, { payload, parentId: payload.parentId }));
      return result;
    }),
  update: t.procedure
    .input(RequestSchema(QuestionOptionRecordUpdateInput))
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
        throw new Error('updateQuestionOptionRecord requires an id and payload');
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
        RETURN fn::updateQuestionOptionRecord($id, $payload);
      `;
      const result = await LRS(await dbInstance.query(query, { id, payload }));
      return result;
    }),
  delete: t.procedure
    .input(RequestSchema(QuestionOptionRecordDeleteInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      let id = input.data?.id;
      if (!id) {
        throw new Error('deleteQuestionOptionRecord requires an id');
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
        RETURN fn::deleteQuestionOptionRecord($id);
      `;
      const result = await LRS(await dbInstance.query(query, { id }));
      return result;
    }),
  get: t.procedure
    .input(RequestSchema(QuestionOptionRecordSubtableGetInput))
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
          return type::record("qor", <int> $subId);
        } else {
          return type::record("qor", $subId);
        };
        RETURN SELECT * FROM only $RID;
      `;
      const result = await LRS(await dbInstance.query(query, { id: raw }));
      return result;
    }),
});
