DEFINE TABLE IF NOT EXISTS classificationRule TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE ClassificationRuleAdmin TYPE NORMAL AS
SELECT
    id,
    space,
    key,
    name,
    matcher,
    scope,
    targetMerchant,
    targetCategory,
    priority,
    active,
    notes
FROM classificationRule
PERMISSIONS FULL;
