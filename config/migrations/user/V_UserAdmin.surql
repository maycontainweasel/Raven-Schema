DEFINE TABLE IF NOT EXISTS u TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE UserAdmin TYPE NORMAL AS
SELECT
    id,
    email,
    password,
    firstName,
    surname,
    uniqueId
FROM u;
