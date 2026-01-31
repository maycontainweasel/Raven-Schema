import { z } from 'zod';
import { t } from '@schema/server/trpc/context';

import { RequestSchema } from '@schema/request-schema';
import { Z_Car, RecordID_z } from '@schema/types';

const CarCreateInput = Z_Car.partial().merge(
  Z_Car.pick({
  carid: true,
  name: true,
  color: true,
  taste: true,
  price: true,
  quantity: true,
  })
);

const CarUpdateInput = z.union([
  z.object({
    id: z.union([z.string().min(1), z.number(), RecordID_z]),
    payload: Z_Car.omit({ id: true }).partial(),
  }),
  z.object({
    id: z.union([z.string().min(1), z.number(), RecordID_z]),
  }).merge(Z_Car.omit({ id: true }).partial()),
]);

const CarDeleteInput = z.object({
  id: z.union([z.string().min(1), z.number(), RecordID_z]),
});

export const carRouter = t.router({
  create: t.procedure
    .input(RequestSchema(CarCreateInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      const payload = input.data;
      if (!payload) {
        throw new Error('Car create payload is required');
      }
      const query = /* surql */ `
        RETURN fn::createCar($payload);
      `;
      const result = await LRS(await dbInstance.query(query, { payload }));
      return result;
    }),
  update: t.procedure
    .input(RequestSchema(CarUpdateInput))
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
        throw new Error('updateCar requires an id and payload');
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
        RETURN fn::updateCar($id, $payload);
      `;
      const result = await LRS(await dbInstance.query(query, { id, payload }));
      return result;
    }),
  delete: t.procedure
    .input(RequestSchema(CarDeleteInput))
    .mutation(async ({ input, ctx }) => {
      const { db, LRS } = ctx;
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db;
      let id = input.data?.id;
      if (!id) {
        throw new Error('deleteCar requires an id');
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
        RETURN fn::deleteCar($id);
      `;
      const result = await LRS(await dbInstance.query(query, { id }));
      return result;
    }),
});
