DEFINE TABLE IF NOT EXISTS announcement TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE AnnouncementAdmin TYPE NORMAL AS
SELECT
    id,
    title,
    message,
    style,
    severity,
    dismissible,
    startsAt,
    endsAt,
    active,
    instances,
    (select status, createdAt, updatedAt from only fn::PID($this.id)) AS post
FROM announcement;
