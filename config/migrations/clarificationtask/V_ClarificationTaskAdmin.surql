DEFINE TABLE IF NOT EXISTS clarificationTask TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE ClarificationTaskAdmin TYPE NORMAL AS
SELECT
    id,
    space,
    key,
    transaction,
    status,
    question,
    reason,
    suggestedSpace,
    suggestedMerchant,
    suggestedCategory,
    resolvedAt,
    resolutionNotes,
    confidence,
    notes
FROM clarificationTask
PERMISSIONS FULL;
