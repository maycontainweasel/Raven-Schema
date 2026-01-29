import { z } from 'zod';
import { RecordID_z } from '../core';

export const QuestionOptionRecordIdSubId_z = z.string();

export const QuestionOptionRecordId_z = RecordID_z.extend({
  tb: z.literal('qor'),
  id: QuestionOptionRecordIdSubId_z,
});
export type QuestionOptionRecordIdSubId = z.infer<typeof QuestionOptionRecordIdSubId_z>;
export type QuestionOptionRecordId = z.infer<typeof QuestionOptionRecordId_z>;

export const Z_QuestionOptionRecord = z.object({
  id: QuestionOptionRecordId_z.optional(),
  q: z.string(),
  qOption: z.string(),
  attempts: z.number().optional(),
  noCorrect: z.number().optional(),
  noIncorrect: z.number().optional(),
  percCorrect: z.number().optional(),
});

export type QuestionOptionRecord = z.infer<typeof Z_QuestionOptionRecord>;
