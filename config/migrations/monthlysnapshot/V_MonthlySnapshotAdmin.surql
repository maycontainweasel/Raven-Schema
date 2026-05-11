DEFINE TABLE IF NOT EXISTS monthlySnapshot TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE MonthlySnapshotAdmin TYPE NORMAL AS
SELECT
    id,
    space,
    month,
    currency,
    incomeTotal,
    outflowTotal,
    netTotal,
    transferTotal,
    cashAvailable,
    recurringTotal,
    businessSpendTotal,
    personalSpendTotal,
    generatedAt,
    status,
    notes
FROM monthlySnapshot
PERMISSIONS FULL;
