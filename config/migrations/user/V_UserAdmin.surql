DEFINE TABLE IF NOT EXISTS u TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE UserAdmin TYPE NORMAL AS
SELECT
    id,
    email,
    firstName,
    surname,
    password,
    uniqueId,
    customerId,
    profile,
    state,
    settings
FROM u;
