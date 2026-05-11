DEFINE TABLE IF NOT EXISTS statementImport TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE StatementImportAdmin TYPE NORMAL AS
SELECT
    id,
    space,
    account,
    key,
    sourceFileName,
    sourceFormat,
    importedAt,
    statementDate,
    status,
    rowCount,
    normalizedCount,
    clarificationCount,
    sourceChecksum,
    notes
FROM statementImport
PERMISSIONS FULL;
