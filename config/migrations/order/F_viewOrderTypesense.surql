DEFINE FUNCTION OVERWRITE fn::viewOrderTypesense($OrderId: any) {

	let $RID = fn::ridParam("order", $OrderId);

	if !type::is_record($RID) || !record::exists($RID) {
		throw 'viewOrderTypesense | expects valid $OrderId record';
	};

	return SELECT
	    stripeID,
	    stripeOrderID,
	    status,
	    type,
	    currency,
	    amountTotal,
	    time::unix($this.createdAt) AS createdAt,
	    time::unix($this.updatedAt) AS updatedAt,
	    (select value firstName from only $this.u) AS userName,
	    (select value surname from only $this.u) AS userSurname,
	    (select value email from only $this.u) AS userEmail,
	    (select value customerID from only $this.u) AS userCustomerID,
	    $this.instances || [] AS instances,
	    (<string> record::id($this.id)) AS id,
	    (<string> record::id($this.exam)) AS exam,
	    (<string> record::id($this.productID)) AS productID,
	    (<string> record::id($this.variantID)) AS variantID,
	    (<string> record::id($this.extensionID)) AS extensionID
	FROM only $RID;
};
