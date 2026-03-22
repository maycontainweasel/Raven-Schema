# Read-First Sources

- `config/graph.mpdg`: authoring source for model shape and capabilities.
- `config/app.config.yaml`: app-level instance topology and runtime capability source.
- `src/lib/modelsManifest.ts`: emitted model metadata and authority normalization.
- `src/lib/databasesExport.ts`: emitted database topology contract.
- `module/src/resources/composables/useCRUD.ts`: orchestration implementation behind `useApiProcess()`.
- `module/src/resources/composables/useTypesense.ts`: server-backed Typesense transport contract.
- `module/src/resources/composables/useTypesenseDirectory.ts`: directory search state contract.
- `module/docs/controllers/<model>.md`: model-oriented runtime/controller reference.
