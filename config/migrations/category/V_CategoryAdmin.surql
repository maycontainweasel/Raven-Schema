DEFINE TABLE IF NOT EXISTS category TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE CategoryAdmin TYPE NORMAL AS
SELECT
    id,
    space,
    key,
    name,
    categoryKind,
    parentCategory,
    active,
    notes
FROM category
PERMISSIONS FULL;
