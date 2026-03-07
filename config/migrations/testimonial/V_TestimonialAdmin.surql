DEFINE TABLE IF NOT EXISTS testimonial TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE TestimonialAdmin TYPE NORMAL AS
SELECT
    id,
    name,
    role,
    organisation,
    quote,
    rating,
    order,
    active,
    instances,
    (select status, createdAt, updatedAt from only fn::PID($this.id)) AS post
FROM testimonial;
