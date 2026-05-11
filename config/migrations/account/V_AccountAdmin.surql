DEFINE TABLE IF NOT EXISTS account TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE AccountAdmin TYPE NORMAL AS
SELECT
    id,
    space,
    key,
    name,
    bankName,
    accountType,
    currency,
    accountNumberLast4,
    openingBalance,
    active,
    notes
FROM account
PERMISSIONS FULL;
