import { z } from 'zod';
import { RecordID_z } from '../core';

export const UserQuestionOptionRecordIdSubId_z = z.string();

export const UserQuestionOptionRecordId_z = RecordID_z.extend({
  tb: z.literal('uqor'),
  id: UserQuestionOptionRecordIdSubId_z,
});
export type UserQuestionOptionRecordIdSubId = z.infer<typeof UserQuestionOptionRecordIdSubId_z>;
export type UserQuestionOptionRecordId = z.infer<typeof UserQuestionOptionRecordId_z>;

export const Z_UserQuestionOptionRecord = z.object({
  id: UserQuestionOptionRecordId_z.optional(),
  u: z.string(),
  qOption: z.string(),
  attempts: z.number().optional(),
  correct: z.number().optional(),
  incorrect: z.number().optional(),
  percCorrect: z.number().optional(),
  order: z.number().optional(),
});

export type UserQuestionOptionRecord = z.infer<typeof Z_UserQuestionOptionRecord>;
