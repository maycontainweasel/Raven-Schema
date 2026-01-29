import { z } from 'zod';
import { t } from '@schema/server/trpc/context';

import { RequestSchema } from '@schema/request-schema';
import { Z_User, RecordID_z } from '@schema/types';

const UserCreateInput = Z_User.omit({
  uniqueId: true,
}).partial().merge(
  Z_User.omit({
  uniqueId: true,
}).pick({
  email: true,
  password: true,
  firstName: true,
  surname: true,
  role: true,
  })
);

const UserUpdateInput = z.union([
  z.object({
    id: z.union([z.string().min(1), z.number(), RecordID_z]),
    payload: Z_User.omit({
  uniqueId: true,
}).omit({ id: true }).partial(),
  }),
  z.object({
    id: z.union([z.string().min(1), z.number(), RecordID_z]),
  }).merge(Z_User.omit({
  uniqueId: true,
}).omit({ id: true }).partial()),
]);

const UserDeleteInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
});

const UserResourceKey = z.enum(['Admin']);
const UserResourceInput = z.object({
  id: z.union([z.string().min(1), z.number(), z.object({ tb: z.string(), id: z.any() }).passthrough()]),
  key: UserResourceKey.optional(),
  resource: z.string().min(1).optional(),
}).refine((value) => Boolean(value.key ?? value.resource), {
  message: 'A resource key or name is required',
  path: ['resource'],
});

const UserRoleTaxonomyPayload = z.record(z.string(), z.any());
const UserRoleTermPayload = z.union([z.string(), z.record(z.string(), z.any())]);
const UserRoleTermInput = z.any();
const UserRoleAttachInput = z.object({ id: z.union([z.string().min(1), z.number(), RecordID_z]), term: z.any() });
const UserRoleIdInput = z.object({ id: z.union([z.string().min(1), z.number(), RecordID_z]) });
const UserRoleEmptyInput = z.object({}).optional();

const UserRoleRouter = t.router({
  createTaxonomy: t.procedure
    .input(RequestSchema(UserRoleTaxonomyPayload))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const payload = input.data;
      if (!payload) {
        throw new Error('UserRole taxonomy payload is required');
      }
      const query = /* surql */ `
        RETURN fn::createUserRoleTaxonomy($payload);
      `;
      const result = await LRS(await dbInstance.query(query, { payload }));
      return result;
    }),
  addTerm: t.procedure
    .input(RequestSchema(UserRoleTermPayload))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const payload = input.data;
      if (!payload) {
        throw new Error('UserRole term payload is required');
      }
      const query = /* surql */ `
        RETURN fn::addUserRoleTerm($payload);
      `;
      const result = await LRS(await dbInstance.query(query, { payload }));
      return result;
    }),
  removeTerm: t.procedure
    .input(RequestSchema(UserRoleTermInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const term = input.data;
      if (!term) {
        throw new Error('UserRole term is required');
      }
      const query = /* surql */ `
        RETURN fn::removeUserRoleTerm($term);
      `;
      const result = await LRS(await dbInstance.query(query, { term }));
      return result;
    }),
  attach: t.procedure
    .input(RequestSchema(UserRoleAttachInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id, term } = input.data || { id: undefined, term: undefined };
      if (!id || !term) {
        throw new Error('UserRole attach requires id and term');
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
        LET $rid = type::record('u', $id);
        RETURN fn::attachUserRoleTerm($rid, $term);
      `;
      const result = await LRS(await dbInstance.query(query, { id: resolvedId, term }));
      return result;
    }),
  detach: t.procedure
    .input(RequestSchema(UserRoleAttachInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id, term } = input.data || { id: undefined, term: undefined };
      if (!id || !term) {
        throw new Error('UserRole detach requires id and term');
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
        LET $rid = type::record('u', $id);
        RETURN fn::detachUserRoleTerm($rid, $term);
      `;
      const result = await LRS(await dbInstance.query(query, { id: resolvedId, term }));
      return result;
    }),
  getTerms: t.procedure
    .input(RequestSchema(UserRoleEmptyInput))
    .query(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const query = /* surql */ `
        RETURN fn::getUserRoleTerms();
      `;
      const result = await LRS(await dbInstance.query(query));
      return result;
    }),
  getRecordTerms: t.procedure
    .input(RequestSchema(UserRoleIdInput))
    .query(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const { id } = input.data || { id: undefined };
      if (!id) {
        throw new Error('UserRole getRecordTerms requires id');
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
        LET $rid = type::record('u', $id);
        RETURN fn::getUserRoles($rid);
      `;
      const result = await LRS(await dbInstance.query(query, { id: resolvedId }));
      return result;
    }),
});


export const userRouter = t.router({
  create: t.procedure
    .input(RequestSchema(UserCreateInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const payload = input.data;
      if (!payload) {
        throw new Error('User create payload is required');
      }
      const query = /* surql */ `
        RETURN fn::createUser($payload);
      `;
      const result = await LRS(await dbInstance.query(query, { payload }));
      return result;
    }),
  update: t.procedure
    .input(RequestSchema(UserUpdateInput))
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
        throw new Error('updateUser requires an id and payload');
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
        RETURN fn::updateUser($id, $payload);
      `;
      const result = await LRS(await dbInstance.query(query, { id, payload }));
      return result;
    }),
  delete: t.procedure
    .input(RequestSchema(UserDeleteInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      let id = input.data?.id;
      if (!id) {
        throw new Error('deleteUser requires an id');
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
        RETURN fn::deleteUser($id);
      `;
      const result = await LRS(await dbInstance.query(query, { id }));
      return result;
    }),
  role: UserRoleRouter,
  resource: t.procedure
    .input(RequestSchema(UserResourceInput))
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
        throw new Error('User resource requires an id and resource key');
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
        throw new Error('User resource requires an id and resource key');
      }
      const normalizedSelector = normalizeResourceSelector(selector);
      const resolvedKey = resourceSelectorMap[normalizedSelector];
      if (!resolvedKey) {
        throw new Error(`Unsupported resource key: ${selector}`);
      }
      let resourceFn: string | null = null;
      let resourceView: string | null = null;
      let resourceReturnId: 'record' | 'view' = 'record';
      let resourceBaseModel: string = 'u';
      switch (resolvedKey) {
      case 'Admin':
        resourceView = "UserAdmin";
        resourceReturnId = 'record';
        resourceBaseModel = 'u';
        break;
      default:
        throw new Error(`Unsupported resource key: ${resolvedKey}`);

      }
      if (resourceView) {
        const selectIdClause = resourceReturnId === 'record'
          ? ',(type::record("u", record::id($this.id))) as id'
          : '';
        const query = /* surql */ `
          SELECT * ${selectIdClause} FROM only type::record("${resourceView}", $id);
        `;
        const result = await LRS(await dbInstance.query(query, { id: resolvedId }));
        return result;
      }
      if (resourceFn) {
        const query = /* surql */ `
          LET $rid = type::record('u', $id);
          RETURN ${resourceFn}($rid);
        `;
        const result = await LRS(await dbInstance.query(query, { id: resolvedId }));
        return result;
      }
      throw new Error(`Unsupported resource key: ${resolvedKey}`);
    }),
});
