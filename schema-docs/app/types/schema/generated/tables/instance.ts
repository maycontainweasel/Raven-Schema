import { z } from 'zod';
import { RecordID_z } from '../core';

export const InstanceIdSubId_z = z.string();

export const InstanceId_z = RecordID_z.extend({
  tb: z.literal('instance'),
  id: InstanceIdSubId_z,
});
export type InstanceIdSubId = z.infer<typeof InstanceIdSubId_z>;
export type InstanceId = z.infer<typeof InstanceId_z>;

export const Z_Instance = z.object({
  id: InstanceId_z.optional(),
  key: z.string(),
  instance: z.string().optional(),
  title: z.string(),
  status: z.enum(["active", "inactive", "maintenance"]).optional(),
  active: z.boolean().optional(),
});

export type Instance = z.infer<typeof Z_Instance>;
