DEFINE TABLE IF NOT EXISTS financialSpace TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE FinancialSpaceAdmin TYPE NORMAL AS
SELECT
    id,
    key,
    name,
    spaceType,
    currency,
    description,
    active,
    archivedAt
FROM financialSpace
PERMISSIONS FULL;
