import { z } from "zod";
import { InstanceCode_z } from "./commons";


// Base RecordID schema - SurrealDB record ID structure
export const RecordID_z = z.object({
  tb: z.string(), // table name
  id: z.any() // can be string, array, object, etc.
})
export type RecordID = z.infer<typeof RecordID_z>


export const InstanceID_z = z.object({
  tb: z.literal('instance'), // must be 'u' for user table  
  id: InstanceCode_z // user IDs are strings
})
export type InstanceID = z.infer<typeof InstanceID_z>


// Specific RecordID types for different tables
export const UserID_z = z.object({
  tb: z.literal('u'), // must be 'u' for user table  
  id: z.string() // user IDs are strings
})
export type UserID = z.infer<typeof UserID_z>

export const ExamID_z = z.object({
  tb: z.literal('exam'), // must be 'exam' for exam table
  id: z.string() // exam IDs are strings  
})
export type ExamID = z.infer<typeof ExamID_z>

export const SessionID_z = z.object({
  tb: z.literal('s'), // must be 'session' for session table
  id: z.string() // session IDs are strings
})
export type SessionID = z.infer<typeof SessionID_z>

export const QuestionID_z = z.object({
  tb: z.literal('q'), // must be 'question' for question table
  id: z.preprocess((val) => {
    if (typeof val === 'number') return val
    if (typeof val === 'string' && /^\d+$/.test(val)) return Number(val)
    return val
  }, z.number())
})
export type QuestionID = z.infer<typeof QuestionID_z>

export const ProductID_z = z.object({
  tb: z.literal('product'), // must be 'product' for product table
  id: z.string() // product IDs are strings
})
export type ProductID = z.infer<typeof ProductID_z>

export const OrganisationID_z = z.object({
  tb: z.literal('organisation'),
  id: z.string()
})
export type OrganisationID = z.infer<typeof OrganisationID_z>

export const ProductVariantID_z = z.object({
  tb: z.literal('productVariant'), // must be 'product' for product table
  id: z.tuple([ProductID_z, z.number(), z.string()]) // id is a fixed size array with an object, number, and string
})
export type ProductVariantID = z.infer<typeof ProductVariantID_z>

const OrderStandardCompositeID_z = z.tuple([UserID_z, z.string()])
const OrderTrialCompositeID_z = z.tuple([z.literal('trial'), ExamID_z, UserID_z])

export const OrderID_z = z.object({
  tb: z.literal('order'),
  id: z.union([
    z.string(),
    OrderStandardCompositeID_z,
    OrderTrialCompositeID_z
  ])
})
export type OrderID = z.infer<typeof OrderID_z>

export const PostID_z = z.object({
  tb: z.literal('p'), // must be 'post' for post table
  id: z.tuple([z.string(), z.string()]) // id is a fixed size array with an object, number, and string
})
export type PostID = z.infer<typeof PostID_z>

export const UserExamDateID_z = z.object({
  tb: z.literal('uExamDate'), // must be 'userExamDate' for userExamDate table
  id: z.tuple([UserID_z, ExamID_z]) // id is a fixed size array with an object, number, and string
})
export type UserExamDateID = z.infer<typeof UserExamDateID_z>




// Not sure if we need these

// Helper function to validate and convert string IDs to RecordID objects
export function createUserID(id: string): UserID {
  return { tb: 'u', id }
}

export function createExamID(id: string): ExamID {
  return { tb: 'exam', id }
}

export function createSessionID(id: string): SessionID {
  return { tb: 's', id }
}

export function createQuestionID(id: number): QuestionID {
  return { tb: 'q', id }
}

export function createProductID(id: string): ProductID {
  return { tb: 'product', id }
}

export function createOrganisationID(id: string): OrganisationID {
  return { tb: 'organisation', id }
}
