import { z } from 'zod';
import { RecordID_z } from '../core';

export const QuestionOptionIdSubId_z = z.string();

export const QuestionOptionId_z = RecordID_z.extend({
  tb: z.literal('qOption'),
  id: QuestionOptionIdSubId_z,
});
export type QuestionOptionIdSubId = z.infer<typeof QuestionOptionIdSubId_z>;
export type QuestionOptionId = z.infer<typeof QuestionOptionId_z>;

export const Z_QuestionOption = z.object({
  id: QuestionOptionId_z.optional(),
  optionKey: z.string().optional(),
  label: z.string(),
  correct: z.boolean().optional(),
  order: z.number().optional(),
});

export type QuestionOption = z.infer<typeof Z_QuestionOption>;
