import type { ModelLayoutSpec, ModelUIFieldSpec } from '#helios-admin/app/types/model-spec'

export type ModelCreateRecordSyncResponse = {
  ok?: boolean
  slug?: string
  redirectTo?: string
  identifiers?: Record<string, any>
  typesense?: Record<string, any> | null
}

export type ModelCreateRecordLogger = {
  info: (message: string, payload?: any) => void
  warn: (message: string, payload?: any) => void
  error: (message: string, payload?: any) => void
}

export type ModelCreateRecordContext = {
  modelKey: string
  spec: ModelLayoutSpec
  requiredKeys: string[]
  createDraft: Record<string, any>
  getCreateDraft: () => Record<string, any>
  setCreateDraft: (draft: Record<string, any>) => void
  setCreateError: (message: string) => void
  resolveFieldKey: (field: ModelUIFieldSpec) => string
  normalizePayloadValue: (field: ModelUIFieldSpec, value: unknown) => unknown
  buildPayload: () => Record<string, any>
  processCreate: (payload: Record<string, any>) => Promise<any>
  extractFirstObject: (value: unknown) => Record<string, any> | null
  syncRecord: (record: Record<string, any>) => Promise<ModelCreateRecordSyncResponse>
  refreshDirectory: () => Promise<unknown>
  closeCreateDialog: () => void
  resetCreateDraft: () => void
  navigateAfterSync: (syncResponse: ModelCreateRecordSyncResponse) => Promise<void>
  defaultCreateRecord: () => Promise<void>
  logger: ModelCreateRecordLogger
}

export type ModelCreateRecordOverride = (context: ModelCreateRecordContext) => Promise<void>
