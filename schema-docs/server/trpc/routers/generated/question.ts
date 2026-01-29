import { z } from 'zod';
import { t } from '@schema/server/trpc/context';

import { RequestSchema } from '@schema/request-schema';
import { Z_Question, RecordID_z } from '@schema/types';

const QuestionTaxonomyInput = z.object({
  categories: z.any().optional(),
});

const QuestionCreateInput = Z_Question.partial().merge(
  Z_Question.pick({
  qid: true,
  question: true,
  })
).merge(QuestionTaxonomyInput);

const QuestionUpdateInput = z.union([
  z.object({
    id: z.union([z.string().min(1), z.number(), RecordID_z]),
    payload: Z_Question.omit({ id: true }).partial().merge(QuestionTaxonomyInput),
  }),
  z.object({
    id: z.union([z.string().min(1), z.number(), RecordID_z]),
  }).merge(Z_Question.omit({ id: true }).partial().merge(QuestionTaxonomyInput)),
]);

const QuestionDeleteInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
});

const QuestionResourceKey = z.enum(['Admin']);
const QuestionResourceInput = z.object({
  id: z.union([z.string().min(1), z.number(), z.object({ tb: z.string(), id: z.any() }).passthrough()]),
  key: QuestionResourceKey.optional(),
  resource: z.string().min(1).optional(),
}).refine((value) => Boolean(value.key ?? value.resource), {
  message: 'A resource key or name is required',
  path: ['resource'],
});

const QuestionQcatTaxonomyPayload = z.record(z.string(), z.any());
const QuestionQcatTermPayload = z.union([z.string(), z.record(z.string(), z.any())]);
const QuestionQcatTermInput = z.any();
const QuestionQcatAttachInput = z.object({ id: z.union([z.string().min(1), z.number(), RecordID_z]), term: z.any() });
const QuestionQcatIdInput = z.object({ id: z.union([z.string().min(1), z.number(), RecordID_z]) });
const QuestionQcatEmptyInput = z.object({}).optional();

const QuestionQcatRouter = t.router({
  createTaxonomy: t.procedure
    .input(RequestSchema(QuestionQcatTaxonomyPayload))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const payload = input.data;
      if (!payload) {
        throw new Error('QuestionQcat taxonomy payload is required');
      }
      const query = /* surql */ `
        RETURN fn::createQuestionQcatTaxonomy($payload);
      `;
      const result = await LRS(await dbInstance.query(query, { payload }));
      return result;
    }),
  addTerm: t.procedure
    .input(RequestSchema(QuestionQcatTermPayload))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const payload = input.data;
      if (!payload) {
        throw new Error('QuestionQcat term payload is required');
      }
      const query = /* surql */ `
        RETURN fn::addQuestionQcatTerm($payload);
      `;
      const result = await LRS(await dbInstance.query(query, { payload }));
      return result;
    }),
  removeTerm: t.procedure
    .input(RequestSchema(QuestionQcatTermInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const term = input.data;
      if (!term) {
        throw new Error('QuestionQcat term is required');
      }
      const query = /* surql */ `
        RETURN fn::removeQuestionQcatTerm($term);
      `;
      const result = await LRS(await dbInstance.query(query, { term }));
      return result;
    }),
  attach: t.procedure
    .input(RequestSchema(QuestionQcatAttachInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id, term } = input.data || { id: undefined, term: undefined };
      if (!id || !term) {
        throw new Error('QuestionQcat attach requires id and term');
      }
      let resolvedId: any = id;
      if (resolvedId && typeof resolvedId === 'object') {
        resolvedId = (resolvedId as any).id ?? (resolvedId as any).value ?? resolvedId;
      }
      if (typeof resolvedId === 'string') {
        const trimmed = resolvedId.trim();
        const asNumber = Number(trimmed);
        resolvedId = trimmed !== '' && !Number.isNaN(asNumber) ? asNumber : trimmed;
      }
      const query = /* surql */ `
        LET $rid = type::record('q', $id);
        RETURN fn::attachQuestionQcatTerm($rid, $term);
      `;
      const result = await LRS(await dbInstance.query(query, { id: resolvedId, term }));
      return result;
    }),
  detach: t.procedure
    .input(RequestSchema(QuestionQcatAttachInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id, term } = input.data || { id: undefined, term: undefined };
      if (!id || !term) {
        throw new Error('QuestionQcat detach requires id and term');
      }
      let resolvedId: any = id;
      if (resolvedId && typeof resolvedId === 'object') {
        resolvedId = (resolvedId as any).id ?? (resolvedId as any).value ?? resolvedId;
      }
      if (typeof resolvedId === 'string') {
        const trimmed = resolvedId.trim();
        const asNumber = Number(trimmed);
        resolvedId = trimmed !== '' && !Number.isNaN(asNumber) ? asNumber : trimmed;
      }
      const query = /* surql */ `
        LET $rid = type::record('q', $id);
        RETURN fn::detachQuestionQcatTerm($rid, $term);
      `;
      const result = await LRS(await dbInstance.query(query, { id: resolvedId, term }));
      return result;
    }),
  getTerms: t.procedure
    .input(RequestSchema(QuestionQcatEmptyInput))
    .query(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const query = /* surql */ `
        RETURN fn::getQuestionQcatTerms();
      `;
      const result = await LRS(await dbInstance.query(query));
      return result;
    }),
  getRecordTerms: t.procedure
    .input(RequestSchema(QuestionQcatIdInput))
    .query(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id } = input.data || { id: undefined };
      if (!id) {
        throw new Error('QuestionQcat getRecordTerms requires id');
      }
      let resolvedId: any = id;
      if (resolvedId && typeof resolvedId === 'object') {
        resolvedId = (resolvedId as any).id ?? (resolvedId as any).value ?? resolvedId;
      }
      if (typeof resolvedId === 'string') {
        const trimmed = resolvedId.trim();
        const asNumber = Number(trimmed);
        resolvedId = trimmed !== '' && !Number.isNaN(asNumber) ? asNumber : trimmed;
      }
      const query = /* surql */ `
        LET $rid = type::record('q', $id);
        RETURN fn::getQuestionQcats($rid);
      `;
      const result = await LRS(await dbInstance.query(query, { id: resolvedId }));
      return result;
    }),
});

const QuestionQtagTaxonomyPayload = z.record(z.string(), z.any());
const QuestionQtagTermPayload = z.union([z.string(), z.record(z.string(), z.any())]);
const QuestionQtagTermInput = z.any();
const QuestionQtagAttachInput = z.object({ id: z.union([z.string().min(1), z.number(), RecordID_z]), term: z.any() });
const QuestionQtagIdInput = z.object({ id: z.union([z.string().min(1), z.number(), RecordID_z]) });
const QuestionQtagEmptyInput = z.object({}).optional();

const QuestionQtagRouter = t.router({
  createTaxonomy: t.procedure
    .input(RequestSchema(QuestionQtagTaxonomyPayload))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const payload = input.data;
      if (!payload) {
        throw new Error('QuestionQtag taxonomy payload is required');
      }
      const query = /* surql */ `
        RETURN fn::createQuestionQtagTaxonomy($payload);
      `;
      const result = await LRS(await dbInstance.query(query, { payload }));
      return result;
    }),
  addTerm: t.procedure
    .input(RequestSchema(QuestionQtagTermPayload))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const payload = input.data;
      if (!payload) {
        throw new Error('QuestionQtag term payload is required');
      }
      const query = /* surql */ `
        RETURN fn::addQuestionQtagTerm($payload);
      `;
      const result = await LRS(await dbInstance.query(query, { payload }));
      return result;
    }),
  removeTerm: t.procedure
    .input(RequestSchema(QuestionQtagTermInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const term = input.data;
      if (!term) {
        throw new Error('QuestionQtag term is required');
      }
      const query = /* surql */ `
        RETURN fn::removeQuestionQtagTerm($term);
      `;
      const result = await LRS(await dbInstance.query(query, { term }));
      return result;
    }),
  attach: t.procedure
    .input(RequestSchema(QuestionQtagAttachInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id, term } = input.data || { id: undefined, term: undefined };
      if (!id || !term) {
        throw new Error('QuestionQtag attach requires id and term');
      }
      let resolvedId: any = id;
      if (resolvedId && typeof resolvedId === 'object') {
        resolvedId = (resolvedId as any).id ?? (resolvedId as any).value ?? resolvedId;
      }
      if (typeof resolvedId === 'string') {
        const trimmed = resolvedId.trim();
        const asNumber = Number(trimmed);
        resolvedId = trimmed !== '' && !Number.isNaN(asNumber) ? asNumber : trimmed;
      }
      const query = /* surql */ `
        LET $rid = type::record('q', $id);
        RETURN fn::attachQuestionQtagTerm($rid, $term);
      `;
      const result = await LRS(await dbInstance.query(query, { id: resolvedId, term }));
      return result;
    }),
  detach: t.procedure
    .input(RequestSchema(QuestionQtagAttachInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id, term } = input.data || { id: undefined, term: undefined };
      if (!id || !term) {
        throw new Error('QuestionQtag detach requires id and term');
      }
      let resolvedId: any = id;
      if (resolvedId && typeof resolvedId === 'object') {
        resolvedId = (resolvedId as any).id ?? (resolvedId as any).value ?? resolvedId;
      }
      if (typeof resolvedId === 'string') {
        const trimmed = resolvedId.trim();
        const asNumber = Number(trimmed);
        resolvedId = trimmed !== '' && !Number.isNaN(asNumber) ? asNumber : trimmed;
      }
      const query = /* surql */ `
        LET $rid = type::record('q', $id);
        RETURN fn::detachQuestionQtagTerm($rid, $term);
      `;
      const result = await LRS(await dbInstance.query(query, { id: resolvedId, term }));
      return result;
    }),
  getTerms: t.procedure
    .input(RequestSchema(QuestionQtagEmptyInput))
    .query(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const query = /* surql */ `
        RETURN fn::getQuestionQtagTerms();
      `;
      const result = await LRS(await dbInstance.query(query));
      return result;
    }),
  getRecordTerms: t.procedure
    .input(RequestSchema(QuestionQtagIdInput))
    .query(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id } = input.data || { id: undefined };
      if (!id) {
        throw new Error('QuestionQtag getRecordTerms requires id');
      }
      let resolvedId: any = id;
      if (resolvedId && typeof resolvedId === 'object') {
        resolvedId = (resolvedId as any).id ?? (resolvedId as any).value ?? resolvedId;
      }
      if (typeof resolvedId === 'string') {
        const trimmed = resolvedId.trim();
        const asNumber = Number(trimmed);
        resolvedId = trimmed !== '' && !Number.isNaN(asNumber) ? asNumber : trimmed;
      }
      const query = /* surql */ `
        LET $rid = type::record('q', $id);
        RETURN fn::getQuestionQtags($rid);
      `;
      const result = await LRS(await dbInstance.query(query, { id: resolvedId }));
      return result;
    }),
});


const QuestionQuestionOptionSubtableCreateInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
  payload: z.record(z.string(), z.any()),
});
const QuestionQuestionOptionSubtableUpdateInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
  payload: z.record(z.string(), z.any()),
});
const QuestionQuestionOptionSubtableDeleteInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
});
const QuestionQuestionOptionSubtableGetInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
});
const QuestionQuestionOptionSubtableListInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
  start: z.number().optional(),
  limit: z.number().optional(),
});

const QuestionQuestionOptionSubtableRouter = t.router({
  create: t.procedure
    .input(RequestSchema(QuestionQuestionOptionSubtableCreateInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id, payload } = input.data || { id: undefined, payload: undefined };
      if (!id || !payload) {
        throw new Error('QuestionQuestionOptionSubtable create requires id and payload');
      }
      const query = /* surql */ `
        LET $parent = fn::ridParam('q', $id);
        RETURN fn::createQuestionOption($parent, $payload);
      `;
      const result = await LRS(await dbInstance.query(query, { id, payload }));
      return result;
    }),
  update: t.procedure
    .input(RequestSchema(QuestionQuestionOptionSubtableUpdateInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id, payload } = input.data || { id: undefined, payload: undefined };
      if (!id || !payload) {
        throw new Error('QuestionQuestionOptionSubtable update requires id and payload');
      }
      const query = /* surql */ `
        RETURN fn::updateQuestionOption($id, $payload);
      `;
      const result = await LRS(await dbInstance.query(query, { id, payload }));
      return result;
    }),
  delete: t.procedure
    .input(RequestSchema(QuestionQuestionOptionSubtableDeleteInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id } = input.data || { id: undefined };
      if (!id) {
        throw new Error('QuestionQuestionOptionSubtable delete requires id');
      }
      const query = /* surql */ `
        RETURN fn::deleteQuestionOption($id);
      `;
      const result = await LRS(await dbInstance.query(query, { id }));
      return result;
    }),
  get: t.procedure
    .input(RequestSchema(QuestionQuestionOptionSubtableGetInput))
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
    .input(RequestSchema(QuestionQuestionOptionSubtableListInput))
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
        LET $RID = fn::ridParam("q", $id);
        RETURN SELECT * FROM qOption WHERE <-( QuestionOption WHERE in = $RID );
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

const QuestionQuestionRecordSubtableCreateInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
  payload: z.record(z.string(), z.any()),
});
const QuestionQuestionRecordSubtableUpdateInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
  payload: z.record(z.string(), z.any()),
});
const QuestionQuestionRecordSubtableDeleteInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
});
const QuestionQuestionRecordSubtableGetInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
});

const QuestionQuestionRecordSubtableRouter = t.router({
  create: t.procedure
    .input(RequestSchema(QuestionQuestionRecordSubtableCreateInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id, payload } = input.data || { id: undefined, payload: undefined };
      if (!id || !payload) {
        throw new Error('QuestionQuestionRecordSubtable create requires id and payload');
      }
      const query = /* surql */ `
        LET $parent = fn::ridParam('q', $id);
        RETURN fn::createQuestionRecord($parent, $payload);
      `;
      const result = await LRS(await dbInstance.query(query, { id, payload }));
      return result;
    }),
  update: t.procedure
    .input(RequestSchema(QuestionQuestionRecordSubtableUpdateInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id, payload } = input.data || { id: undefined, payload: undefined };
      if (!id || !payload) {
        throw new Error('QuestionQuestionRecordSubtable update requires id and payload');
      }
      const query = /* surql */ `
        RETURN fn::updateQuestionRecord($id, $payload);
      `;
      const result = await LRS(await dbInstance.query(query, { id, payload }));
      return result;
    }),
  delete: t.procedure
    .input(RequestSchema(QuestionQuestionRecordSubtableDeleteInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id } = input.data || { id: undefined };
      if (!id) {
        throw new Error('QuestionQuestionRecordSubtable delete requires id');
      }
      const query = /* surql */ `
        RETURN fn::deleteQuestionRecord($id);
      `;
      const result = await LRS(await dbInstance.query(query, { id }));
      return result;
    }),
  get: t.procedure
    .input(RequestSchema(QuestionQuestionRecordSubtableGetInput))
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
          return type::record("qRecord", <int> $subId);
        } else {
          return type::record("qRecord", $subId);
        };
        RETURN SELECT * FROM only $RID;
      `;
      const result = await LRS(await dbInstance.query(query, { id: raw }));
      return result;
    }),
});

const QuestionSubtablesRouter = t.router({
  questionOption: QuestionQuestionOptionSubtableRouter,
  questionRecord: QuestionQuestionRecordSubtableRouter,
});


export const questionRouter = t.router({
  create: t.procedure
    .input(RequestSchema(QuestionCreateInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const payload = input.data;
      if (!payload) {
        throw new Error('Question create payload is required');
      }
      const query = /* surql */ `
        RETURN fn::createQuestion($payload);
      `;
      const result = await LRS(await dbInstance.query(query, { payload }));
      return result;
    }),
  update: t.procedure
    .input(RequestSchema(QuestionUpdateInput))
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
        throw new Error('updateQuestion requires an id and payload');
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
        RETURN fn::updateQuestion($id, $payload);
      `;
      const result = await LRS(await dbInstance.query(query, { id, payload }));
      return result;
    }),
  delete: t.procedure
    .input(RequestSchema(QuestionDeleteInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      let id = input.data?.id;
      if (!id) {
        throw new Error('deleteQuestion requires an id');
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
        RETURN fn::deleteQuestion($id);
      `;
      const result = await LRS(await dbInstance.query(query, { id }));
      return result;
    }),
  qcat: QuestionQcatRouter,
  qtag: QuestionQtagRouter,
  subtables: QuestionSubtablesRouter,
  resource: t.procedure
    .input(RequestSchema(QuestionResourceInput))
    .query(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const normalizeResourceSelector = (value: string): string =>
        value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const resourceSelectorMap: Record<string, string> = {
        "admin": "Admin",
      };
      const { id, key, resource } = input.data || { id: undefined, key: undefined, resource: undefined };
      if (!id) {
        throw new Error('Question resource requires an id and resource key');
      }
      let resolvedId: any = id;
      if (resolvedId && typeof resolvedId === 'object') {
        resolvedId = (resolvedId as any).id ?? (resolvedId as any).value ?? resolvedId;
      }
      if (typeof resolvedId === 'string') {
        const trimmed = resolvedId.trim();
        const asNumber = Number(trimmed);
        resolvedId = trimmed !== '' && !Number.isNaN(asNumber) ? asNumber : trimmed;
      }
      const selector = resource ?? key;
      if (!selector) {
        throw new Error('Question resource requires an id and resource key');
      }
      const normalizedSelector = normalizeResourceSelector(selector);
      const resolvedKey = resourceSelectorMap[normalizedSelector];
      if (!resolvedKey) {
        throw new Error(`Unsupported resource key: ${selector}`);
      }
      let resourceFn: string | null = null;
      let resourceView: string | null = null;
      let resourceReturnId: 'record' | 'view' = 'record';
      let resourceBaseModel: string = 'q';
      switch (resolvedKey) {
      case 'Admin':
        resourceFn = "fn::viewQuestionAdmin";
        break;
      default:
        throw new Error(`Unsupported resource key: ${resolvedKey}`);

      }
      if (resourceView) {
        const selectIdClause = resourceReturnId === 'record'
          ? ',(type::record("q", record::id($this.id))) as id'
          : '';
        const query = /* surql */ `
          SELECT * ${selectIdClause} FROM only type::record("${resourceView}", $id);
        `;
        const result = await LRS(await dbInstance.query(query, { id: resolvedId }));
        return result;
      }
      if (resourceFn) {
        const query = /* surql */ `
          LET $rid = type::record('q', $id);
          RETURN ${resourceFn}($rid);
        `;
        const result = await LRS(await dbInstance.query(query, { id: resolvedId }));
        return result;
      }
      throw new Error(`Unsupported resource key: ${resolvedKey}`);
    }),
});
