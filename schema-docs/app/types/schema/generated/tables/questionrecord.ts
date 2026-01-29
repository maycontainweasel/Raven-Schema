import { z } from 'zod';
import { RecordID_z } from '../core';

export const QuestionRecordIdSubId_z = z.string();

export const QuestionRecordId_z = RecordID_z.extend({
  tb: z.literal('qRecord'),
  id: QuestionRecordIdSubId_z,
});
export type QuestionRecordIdSubId = z.infer<typeof QuestionRecordIdSubId_z>;
export type QuestionRecordId = z.infer<typeof QuestionRecordId_z>;

export const Z_QuestionRecord = z.object({
  id: QuestionRecordId_z.optional(),
  q: z.string().optional(),
  attempts: z.number().optional(),
  noCorrect: z.number().optional(),
  noIncorrect: z.number().optional(),
  percCorrect: z.number().optional(),
});

export type QuestionRecord = z.infer<typeof Z_QuestionRecord>;
