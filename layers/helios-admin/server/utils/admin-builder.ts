import type { ModelLayoutSpec, ModelManagerModel } from './model-manager'
import {
  commitModelSpec,
  createDefaultModelSpec,
  findModelManagerModel,
  listModelManagerModels,
  normalizeModelSpec,
  readModelSpec,
  resolveModelManagerPaths,
} from './model-manager'

export type AdminBuilderModel = ModelManagerModel
export type DirectoryBuilderLayout = ModelLayoutSpec

export const resolveAdminBuilderPaths = resolveModelManagerPaths
export const listAdminBuilderModels = listModelManagerModels
export const findAdminBuilderModel = findModelManagerModel

export const createDefaultDirectoryLayout = createDefaultModelSpec
export const normalizeDirectoryLayout = normalizeModelSpec

export const readDirectoryLayout = async (model: AdminBuilderModel, cwd = process.cwd()) => {
  const result = await readModelSpec(model, cwd)
  return {
    layout: result.spec,
    source: result.source,
  }
}

export const commitDirectoryLayout = async (
  model: AdminBuilderModel,
  payload: unknown,
  cwd = process.cwd(),
) => {
  const result = await commitModelSpec(model, payload, cwd)
  return {
    layout: result.spec,
    committedAt: result.committedAt,
    files: result.files,
  }
}
