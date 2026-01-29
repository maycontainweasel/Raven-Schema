import { z } from 'zod';
import { RecordID_z } from '../core';

export const QuestionIdSubId_z = z.string();

export const QuestionId_z = RecordID_z.extend({
  tb: z.literal('q'),
  id: QuestionIdSubId_z,
});
export type QuestionIdSubId = z.infer<typeof QuestionIdSubId_z>;
export type QuestionId = z.infer<typeof QuestionId_z>;

export const Z_Question = z.object({
  id: QuestionId_z.optional(),
  qid: z.number(),
  qCode: z.string().optional(),
  question: z.string(),
  explanation: z.string().optional(),
  explanationRef: z.string().optional(),
  source: z.string().optional(),
  instances: z.array(z.string()).optional(),
  testobject: z.object({
  testobjectnumber: z.number(),
  testobjectstring: z.string().optional(),
  testobjectdarray: z.array(z.string()).optional(),
  testobjectobject: z.object({
    testobjectobjectnumber: z.number(),
    testobjectobjectstring: z.string().optional(),
    testobjectobjectarray: z.array(z.string()).optional(),
  }).optional(),
}).optional(),
  tags: z.array(z.string()).optional(),
});

export type Question = z.infer<typeof Z_Question>;
