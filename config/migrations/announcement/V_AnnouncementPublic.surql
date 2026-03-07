DEFINE TABLE IF NOT EXISTS announcement TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE AnnouncementPublic TYPE NORMAL AS
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
    instances
FROM announcement;
