import { z } from 'zod';
import { t } from '@schema/server/trpc/context';
import { settingsRouter } from './instance/settings';
import { collections } from '@schema/typesense/collections';
import { upsertTypesenseDocuments } from '@schema/server/typesense';

import { RequestSchema } from '@schema/request-schema';
import { Z_Instance, RecordID_z } from '@schema/types';

const InstanceCreateInput = Z_Instance.partial().merge(
  Z_Instance.pick({
  key: true,
  title: true,
  })
);

const InstanceUpdateInput = z.union([
  z.object({
    id: z.union([z.string().min(1), z.number(), RecordID_z]),
    payload: Z_Instance.omit({ id: true }).partial(),
  }),
  z.object({
    id: z.union([z.string().min(1), z.number(), RecordID_z]),
  }).merge(Z_Instance.omit({ id: true }).partial()),
]);

const InstanceDeleteInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
});

const InstanceResourceKey = z.enum(['adminSingle', 'public']);
const InstanceResourceInput = z.object({
  id: z.union([z.string().min(1), z.number(), z.object({ tb: z.string(), id: z.any() }).passthrough()]),
  key: InstanceResourceKey.optional(),
  resource: z.string().min(1).optional(),
}).refine((value) => Boolean(value.key ?? value.resource), {
  message: 'A resource key or name is required',
  path: ['resource'],
});

const InstanceTypesenseResourceInput = z.object({
  id: z.union([z.string().min(1), z.number()]),
});

const InstanceTypesenseListInput = z.object({
  limit: z.number().int().min(-1).optional(),
  start: z.number().int().min(-1).optional(),
});

const InstanceTypesenseCountInput = z.object({});

const InstanceTypesenseCollection = null;

const InstanceInstanceSettingsSubtableCreateInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
  payload: z.record(z.string(), z.any()),
});
const InstanceInstanceSettingsSubtableUpdateInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
  payload: z.record(z.string(), z.any()),
});
const InstanceInstanceSettingsSubtableDeleteInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
});
const InstanceInstanceSettingsSubtableGetInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
});

const InstanceInstanceSettingsSubtableRouter = t.router({
  create: t.procedure
    .input(RequestSchema(InstanceInstanceSettingsSubtableCreateInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id, payload } = input.data || { id: undefined, payload: undefined };
      if (!id || !payload) {
        throw new Error('InstanceInstanceSettingsSubtable create requires id and payload');
      }
      const query = /* surql */ `
        LET $parent = fn::ridParam('instance', $id);
        RETURN fn::createInstanceSettings($parent, $payload);
      `;
      const result = await LRS(await dbInstance.query(query, { id, payload }));
      return result;
    }),
  update: t.procedure
    .input(RequestSchema(InstanceInstanceSettingsSubtableUpdateInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id, payload } = input.data || { id: undefined, payload: undefined };
      if (!id || !payload) {
        throw new Error('InstanceInstanceSettingsSubtable update requires id and payload');
      }
      const query = /* surql */ `
        RETURN fn::updateInstanceSettings($id, $payload);
      `;
      const result = await LRS(await dbInstance.query(query, { id, payload }));
      return result;
    }),
  delete: t.procedure
    .input(RequestSchema(InstanceInstanceSettingsSubtableDeleteInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id } = input.data || { id: undefined };
      if (!id) {
        throw new Error('InstanceInstanceSettingsSubtable delete requires id');
      }
      const query = /* surql */ `
        RETURN fn::deleteInstanceSettings($id);
      `;
      const result = await LRS(await dbInstance.query(query, { id }));
      return result;
    }),
  get: t.procedure
    .input(RequestSchema(InstanceInstanceSettingsSubtableGetInput))
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
          return type::record("instanceSettings", <int> $subId);
        } else {
          return type::record("instanceSettings", $subId);
        };
        RETURN SELECT * FROM only $RID;
      `;
      const result = await LRS(await dbInstance.query(query, { id: raw }));
      return result;
    }),
});

const InstanceSubtablesRouter = t.router({
  settings: InstanceInstanceSettingsSubtableRouter,
});


export const instanceRouter = t.router({
  create: t.procedure
    .input(RequestSchema(InstanceCreateInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const payload = input.data;
      if (!payload) {
        throw new Error('Instance create payload is required');
      }
      const query = /* surql */ `
        RETURN fn::createInstance($payload);
      `;
      const result = await LRS(await dbInstance.query(query, { payload }));
      return result;
    }),
  update: t.procedure
    .input(RequestSchema(InstanceUpdateInput))
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
        throw new Error('updateInstance requires an id and payload');
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
        RETURN fn::updateInstance($id, $payload);
      `;
      const result = await LRS(await dbInstance.query(query, { id, payload }));
      return result;
    }),
  delete: t.procedure
    .input(RequestSchema(InstanceDeleteInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      let id = input.data?.id;
      if (!id) {
        throw new Error('deleteInstance requires an id');
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
        RETURN fn::deleteInstance($id);
      `;
      const result = await LRS(await dbInstance.query(query, { id }));
      return result;
    }),
  subtables: InstanceSubtablesRouter,
  resource: t.procedure
    .input(RequestSchema(InstanceResourceInput))
    .query(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const normalizeResourceSelector = (value: string): string =>
        value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const resourceSelectorMap: Record<string, string> = {
        "adminsingle": "adminSingle",
        "public": "public",
      };
      const { id, key, resource } = input.data || { id: undefined, key: undefined, resource: undefined };
      if (!id) {
        throw new Error('Instance resource requires an id and resource key');
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
        throw new Error('Instance resource requires an id and resource key');
      }
      const normalizedSelector = normalizeResourceSelector(selector);
      const resolvedKey = resourceSelectorMap[normalizedSelector];
      if (!resolvedKey) {
        throw new Error(`Unsupported resource key: ${selector}`);
      }
      let resourceFn: string | null = null;
      let resourceView: string | null = null;
      let resourceReturnId: 'record' | 'view' = 'record';
      let resourceBaseModel: string = 'instance';
      switch (resolvedKey) {
      case 'adminSingle':
        resourceView = "InstanceAdminSingle";
        resourceReturnId = 'record';
        resourceBaseModel = 'instance';
        break;
      case 'public':
        resourceView = "InstancePublic";
        resourceReturnId = 'record';
        resourceBaseModel = 'instance';
        break;
      default:
        throw new Error(`Unsupported resource key: ${resolvedKey}`);

      }
      if (resourceView) {
        const selectIdClause = resourceReturnId === 'record'
          ? ',(type::record("instance", record::id($this.id))) as id'
          : '';
        const query = /* surql */ `
          SELECT * ${selectIdClause} FROM only type::record("${resourceView}", $id);
        `;
        const result = await LRS(await dbInstance.query(query, { id: resolvedId }));
        return result;
      }
      if (resourceFn) {
        const query = /* surql */ `
          LET $rid = type::record('instance', $id);
          RETURN ${resourceFn}($rid);
        `;
        const result = await LRS(await dbInstance.query(query, { id: resolvedId }));
        return result;
      }
      throw new Error(`Unsupported resource key: ${resolvedKey}`);
    }),
  settings: settingsRouter,
  typesense: t.router({
  resource: t.procedure
    .input(RequestSchema(InstanceTypesenseResourceInput))
    .query(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const id = input.data?.id;
      if (!id) {
        throw new Error('typesense.resource | id is required');
      }
      const query = /* surql */ `
        SELECT * FROM only type::record("InstanceTypesense", $id);
      `;
      const result = await LRS(await dbInstance.query(query, { id }));
      return result;
    }),
  list: t.procedure
    .input(RequestSchema(InstanceTypesenseListInput))
    .query(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const limit = typeof input.data?.limit === 'number' ? input.data.limit : -1;
      const start = typeof input.data?.start === 'number' ? input.data.start : -1;
      const params: Record<string, number> = {};
      let query = 'SELECT * FROM InstanceTypesense';
      if (limit >= 0) {
        query += ' LIMIT $limit';
        params.limit = limit;
      }
      if (start >= 0) {
        query += ' START $start';
        params.start = start;
      }
      query += ';';
      const result = await LRS(await dbInstance.query(/* surql */ query, params));
      return result;
    }),
  refresh: t.procedure
    .input(RequestSchema(InstanceTypesenseListInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const limit = typeof input.data?.limit === 'number' ? input.data.limit : -1;
      const start = typeof input.data?.start === 'number' ? input.data.start : -1;
      const params: Record<string, number> = {};
      let query = 'SELECT * FROM InstanceTypesense';
      if (limit >= 0) {
        query += ' LIMIT $limit';
        params.limit = limit;
      }
      if (start >= 0) {
        query += ' START $start';
        params.start = start;
      }
      query += ';';
      const result = await LRS(await dbInstance.query(/* surql */ query, params));
      const records = Array.isArray(result) ? result : result ? [result] : [];
      const upserted = await upsertTypesenseDocuments(InstanceTypesenseCollection, records, 'upsert');
      return { fetched: records.length, upserted, records };
    }),
  count: t.procedure
    .input(RequestSchema(InstanceTypesenseCountInput))
    .query(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const query = /* surql */ `
        RETURN count(select value id from InstanceTypesense);
      `;
      const result = await LRS(await dbInstance.query(query));
      return result;
    }),
  collection: t.procedure
    .query(async () => {
      return InstanceTypesenseCollection;
    }),
  }),
});
