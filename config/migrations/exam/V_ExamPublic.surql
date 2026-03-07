DEFINE TABLE IF NOT EXISTS exam TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE ExamPublic TYPE NORMAL AS
SELECT
    id,
    key,
    title,
    titleShort,
    description,
    colours
FROM exam;
