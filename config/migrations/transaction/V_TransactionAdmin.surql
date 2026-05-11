DEFINE TABLE IF NOT EXISTS transaction TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE TransactionAdmin TYPE NORMAL AS
SELECT
    id,
    space,
    account,
    key,
    sourceRow,
    postedAt,
    effectiveAt,
    description,
    normalizedDescription,
    amount,
    balance,
    currency,
    direction,
    status,
    confidence,
    merchantName,
    merchant,
    category,
    isTransfer,
    manualOverride,
    notes
FROM transaction
PERMISSIONS FULL;
