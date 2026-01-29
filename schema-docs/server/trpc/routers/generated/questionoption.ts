import { z } from 'zod';
import { t } from '@schema/server/trpc/context';

import { RequestSchema } from '@schema/request-schema';
import { Z_QuestionOption, RecordID_z } from '@schema/types';

const QuestionOptionCreateInput = Z_QuestionOption.partial().merge(
  Z_QuestionOption.pick({
  label: true,
  })
).merge(z.object({ parentId: z.union([z.string().min(1), z.number()]) }));

const QuestionOptionUpdateInput = z.union([
  z.object({
    id: z.union([z.string().min(1), z.number(), RecordID_z]),
    payload: Z_QuestionOption.omit({ id: true }).partial(),
  }),
  z.object({
    id: z.union([z.string().min(1), z.number(), RecordID_z]),
  }).merge(Z_QuestionOption.omit({ id: true }).partial()),
]);

const QuestionOptionDeleteInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
});

const QuestionOptionSubtableGetInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
});
const QuestionOptionSubtableListInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
  start: z.number().optional(),
  limit: z.number().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  filters: z.record(z.string(), z.any()).optional(),
});

const QuestionOptionQuestionOptionRecordSubtableCreateInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
  payload: z.record(z.string(), z.any()),
});
const QuestionOptionQuestionOptionRecordSubtableUpdateInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
  payload: z.record(z.string(), z.any()),
});
const QuestionOptionQuestionOptionRecordSubtableDeleteInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
});
const QuestionOptionQuestionOptionRecordSubtableGetInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
});

const QuestionOptionQuestionOptionRecordSubtableRouter = t.router({
  create: t.procedure
    .input(RequestSchema(QuestionOptionQuestionOptionRecordSubtableCreateInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id, payload } = input.data || { id: undefined, payload: undefined };
      if (!id || !payload) {
        throw new Error('QuestionOptionQuestionOptionRecordSubtable create requires id and payload');
      }
      const query = /* surql */ `
        LET $parent = fn::ridParam('qOption', $id);
        RETURN fn::createQuestionOptionRecord($parent, $payload);
      `;
      const result = await LRS(await dbInstance.query(query, { id, payload }));
      return result;
    }),
  update: t.procedure
    .input(RequestSchema(QuestionOptionQuestionOptionRecordSubtableUpdateInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id, payload } = input.data || { id: undefined, payload: undefined };
      if (!id || !payload) {
        throw new Error('QuestionOptionQuestionOptionRecordSubtable update requires id and payload');
      }
      const query = /* surql */ `
        RETURN fn::updateQuestionOptionRecord($id, $payload);
      `;
      const result = await LRS(await dbInstance.query(query, { id, payload }));
      return result;
    }),
  delete: t.procedure
    .input(RequestSchema(QuestionOptionQuestionOptionRecordSubtableDeleteInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id } = input.data || { id: undefined };
      if (!id) {
        throw new Error('QuestionOptionQuestionOptionRecordSubtable delete requires id');
      }
      const query = /* surql */ `
        RETURN fn::deleteQuestionOptionRecord($id);
      `;
      const result = await LRS(await dbInstance.query(query, { id }));
      return result;
    }),
  get: t.procedure
    .input(RequestSchema(QuestionOptionQuestionOptionRecordSubtableGetInput))
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

const QuestionOptionUserQuestionOptionRecordSubtableCreateInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
  payload: z.record(z.string(), z.any()),
});
const QuestionOptionUserQuestionOptionRecordSubtableUpdateInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
  payload: z.record(z.string(), z.any()),
});
const QuestionOptionUserQuestionOptionRecordSubtableDeleteInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
});
const QuestionOptionUserQuestionOptionRecordSubtableGetInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
});
const QuestionOptionUserQuestionOptionRecordSubtableListInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
  start: z.number().optional(),
  limit: z.number().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  filters: z.record(z.string(), z.any()).optional(),
});

const QuestionOptionUserQuestionOptionRecordSubtableRouter = t.router({
  create: t.procedure
    .input(RequestSchema(QuestionOptionUserQuestionOptionRecordSubtableCreateInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id, payload } = input.data || { id: undefined, payload: undefined };
      if (!id || !payload) {
        throw new Error('QuestionOptionUserQuestionOptionRecordSubtable create requires id and payload');
      }
      const query = /* surql */ `
        LET $parent = fn::ridParam('qOption', $id);
        RETURN fn::createUserQuestionOptionRecord($parent, $payload);
      `;
      const result = await LRS(await dbInstance.query(query, { id, payload }));
      return result;
    }),
  update: t.procedure
    .input(RequestSchema(QuestionOptionUserQuestionOptionRecordSubtableUpdateInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id, payload } = input.data || { id: undefined, payload: undefined };
      if (!id || !payload) {
        throw new Error('QuestionOptionUserQuestionOptionRecordSubtable update requires id and payload');
      }
      const query = /* surql */ `
        RETURN fn::updateUserQuestionOptionRecord($id, $payload);
      `;
      const result = await LRS(await dbInstance.query(query, { id, payload }));
      return result;
    }),
  delete: t.procedure
    .input(RequestSchema(QuestionOptionUserQuestionOptionRecordSubtableDeleteInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id } = input.data || { id: undefined };
      if (!id) {
        throw new Error('QuestionOptionUserQuestionOptionRecordSubtable delete requires id');
      }
      const query = /* surql */ `
        RETURN fn::deleteUserQuestionOptionRecord($id);
      `;
      const result = await LRS(await dbInstance.query(query, { id }));
      return result;
    }),
  get: t.procedure
    .input(RequestSchema(QuestionOptionUserQuestionOptionRecordSubtableGetInput))
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
    .input(RequestSchema(QuestionOptionUserQuestionOptionRecordSubtableListInput))
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
      const allowedFields = new Set(["id","u","qOption","attempts","correct","incorrect","percCorrect","order"]);
      const filters = input.data?.filters ?? {};
      const whereParts: string[] = [];
      for (const [key, value] of Object.entries(filters)) {
        if (value === undefined) continue;
        if (!allowedFields.has(key)) {
          throw new Error(`subtable.list | unsupported filter: ${key}`);
        }
        const paramKey = `filter_${key.replace(/[^a-zA-Z0-9_]/g, "_")}`;
        whereParts.push(`${key} = $${paramKey}`);
        params[paramKey] = value;
      }
      const sortBy = input.data?.sortBy ?? 'order';
      const sortDir = (input.data?.sortDir ?? 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
      if (sortBy && !allowedFields.has(sortBy)) {
        throw new Error(`subtable.list | unsupported sort field: ${sortBy}`);
      }
      let query = /* surql */ `
        LET $RID = fn::ridParam("qOption", $id);
        RETURN SELECT * FROM uqor WHERE <-( UserQuestionOptionRecord WHERE in = $RID );
      `;
      if (whereParts.length > 0) {
        query += ' AND ' + whereParts.join(' AND ');
      }
      if (sortBy) {
        query += ` ORDER BY ${sortBy} ${sortDir}`;
      }
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

const QuestionOptionSubtablesRouter = t.router({
  questionOptionRecord: QuestionOptionQuestionOptionRecordSubtableRouter,
  userQuestionOptionRecord: QuestionOptionUserQuestionOptionRecordSubtableRouter,
});


export const questionOptionRouter = t.router({
  create: t.procedure
    .input(RequestSchema(QuestionOptionCreateInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const payload = input.data;
      if (!payload || !payload.parentId) {
        throw new Error('QuestionOption create payload is required (parentId missing)');
      }
      const query = /* surql */ `
        LET $parent = type::record('q', $parentId);
        LET $payload = fn::objectRemove($payload, ["parentId"]);
        RETURN fn::createQuestionOption($parent, $payload);
      `;
      const result = await LRS(await dbInstance.query(query, { payload, parentId: payload.parentId }));
      return result;
    }),
  update: t.procedure
    .input(RequestSchema(QuestionOptionUpdateInput))
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
        throw new Error('updateQuestionOption requires an id and payload');
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
        RETURN fn::updateQuestionOption($id, $payload);
      `;
      const result = await LRS(await dbInstance.query(query, { id, payload }));
      return result;
    }),
  delete: t.procedure
    .input(RequestSchema(QuestionOptionDeleteInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      let id = input.data?.id;
      if (!id) {
        throw new Error('deleteQuestionOption requires an id');
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
        RETURN fn::deleteQuestionOption($id);
      `;
      const result = await LRS(await dbInstance.query(query, { id }));
      return result;
    }),
  get: t.procedure
    .input(RequestSchema(QuestionOptionSubtableGetInput))
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
          return type::record("qOption", <int> $subId);
        } else {
          return type::record("qOption", $subId);
        };
        RETURN SELECT * FROM only $RID;
      `;
      const result = await LRS(await dbInstance.query(query, { id: raw }));
      return result;
    }),
  list: t.procedure
    .input(RequestSchema(QuestionOptionSubtableListInput))
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
      const allowedFields = new Set(["id","optionKey","label","correct","order"]);
      const filters = input.data?.filters ?? {};
      const whereParts: string[] = [];
      for (const [key, value] of Object.entries(filters)) {
        if (value === undefined) continue;
        if (!allowedFields.has(key)) {
          throw new Error(`subtable.list | unsupported filter: ${key}`);
        }
        const paramKey = `filter_${key.replace(/[^a-zA-Z0-9_]/g, "_")}`;
        whereParts.push(`${key} = $${paramKey}`);
        params[paramKey] = value;
      }
      const sortBy = input.data?.sortBy ?? 'order';
      const sortDir = (input.data?.sortDir ?? 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
      if (sortBy && !allowedFields.has(sortBy)) {
        throw new Error(`subtable.list | unsupported sort field: ${sortBy}`);
      }
      let query = /* surql */ `
        LET $RID = fn::ridParam("q", $id);
        RETURN SELECT * FROM qOption WHERE <-( QuestionOption WHERE in = $RID );
      `;
      if (whereParts.length > 0) {
        query += ' AND ' + whereParts.join(' AND ');
      }
      if (sortBy) {
        query += ` ORDER BY ${sortBy} ${sortDir}`;
      }
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
  subtables: QuestionOptionSubtablesRouter,
});
