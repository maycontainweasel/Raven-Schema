DEFINE TABLE IF NOT EXISTS order TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE OrderAdmin TYPE NORMAL AS
SELECT
    id,
    stripeID,
    stripeOrderID,
    status,
    type,
    currency,
    amountTotal,
    amountRefunded,
    createdAt,
    updatedAt,
    (select id, email, firstName, surname, customerID from only $this.u) AS u,
    items,
    exam,
    productID,
    variantID,
    extensionID
FROM order;
