import { z } from 'zod'
import { InstanceCode_z } from '../types/ts/core/commons'

// Overload without extras
export function RequestSchema<Data extends z.ZodTypeAny>(dataSchema: Data): z.ZodObject<{ data: Data; instance?: typeof InstanceCode_z }>

// Overload with db (example extra)
export function RequestSchema<Data extends z.ZodTypeAny, Extras extends Record<string, z.ZodTypeAny>>(
  dataSchema: Data,
  options: Extras,
): z.ZodObject<{ data: Data; instance?: typeof InstanceCode_z } & Extras>

// Implementation
export function RequestSchema<Data extends z.ZodTypeAny, Extras extends Record<string, z.ZodTypeAny>>(
  dataSchema: Data,
  options?: Extras,
): z.ZodObject<{ data: Data; instance?: typeof InstanceCode_z } & Extras> {
  const baseShape: Record<string, z.ZodTypeAny> = {
    data: dataSchema,
    instance: InstanceCode_z.optional(),
  }

  if (options) {
    return z.object({ ...baseShape, ...options }) as z.ZodObject<{ data: Data } & Extras>
  }

  return z.object(baseShape) as z.ZodObject<{ data: Data } & Extras>
}

export type InferRequestSchema<T extends ReturnType<typeof RequestSchema>> = z.infer<T>

