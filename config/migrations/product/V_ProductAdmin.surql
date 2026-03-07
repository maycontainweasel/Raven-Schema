DEFINE TABLE IF NOT EXISTS product TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE ProductAdmin TYPE NORMAL AS
SELECT
    id,
    key,
    slug,
    title,
    description,
    stripePID,
    instances,
    (select value ->ProductExams.out from only $this.id) AS exams
FROM product;
