DEFINE FUNCTION OVERWRITE fn::viewUserPublic($UserId: any) {

	let $RID = fn::ridParam("u", $UserId);

	if !type::is_record($RID) || !record::exists($RID) {
		throw 'viewUserPublic | expects valid $UserId record';
	};

	return SELECT
	    id,
	    firstName,
	    surname,
	    email,
	    uniqueId,
	    customerId,
	    (select * from only $this.role) AS role,
	    instances
	FROM only $RID;
};
