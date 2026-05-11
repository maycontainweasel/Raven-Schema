DEFINE TABLE IF NOT EXISTS statementRow TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE StatementRowAdmin TYPE NORMAL AS
SELECT
    id,
    space,
    account,
    statementImport,
    rowNumber,
    postedAt,
    description,
    normalizedDescription,
    amount,
    balance,
    currency,
    direction,
    status,
    confidence,
    rawData,
    transaction,
    notes
FROM statementRow
PERMISSIONS FULL;
