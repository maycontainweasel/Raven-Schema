DEFINE TABLE IF NOT EXISTS merchant TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE MerchantAdmin TYPE NORMAL AS
SELECT
    id,
    space,
    key,
    name,
    normalizedName,
    active,
    notes
FROM merchant
PERMISSIONS FULL;
