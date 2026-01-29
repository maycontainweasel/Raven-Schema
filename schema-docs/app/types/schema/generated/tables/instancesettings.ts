import { z } from 'zod';
import { RecordID_z } from '../core';

export const InstanceSettingsIDSubId_z = z.string();

export const InstanceSettingsID_z = RecordID_z.extend({
  tb: z.literal('instanceSettings'),
  id: InstanceSettingsIDSubId_z,
});
export type InstanceSettingsIDSubId = z.infer<typeof InstanceSettingsIDSubId_z>;
export type InstanceSettingsID = z.infer<typeof InstanceSettingsID_z>;

export const Z_InstanceSettings = z.object({
  id: InstanceSettingsID_z.optional(),
  currencies: z.array(z.string()).optional(),
  defaultCurrency: z.string().optional(),
});

export type InstanceSettings = z.infer<typeof Z_InstanceSettings>;
