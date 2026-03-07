DEFINE TABLE IF NOT EXISTS exam TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE ExamAdmin TYPE NORMAL AS
SELECT
    id,
    key,
    title,
    titleShort,
    college,
    order,
    qidIndex,
    sheetId,
    description,
    instances,
    colours,
    (select status, createdAt, updatedAt from only fn::PID($this.id)) AS post
FROM exam;
