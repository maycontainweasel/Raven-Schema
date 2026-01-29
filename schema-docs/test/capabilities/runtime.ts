// Test-only entrypoint to avoid alias resolution in Vitest.
// Function-layer tests only need database configs.
export { dbInstances, defaultDbInstance } from '../../modules/schema-kit/runtime/generated/databases'
