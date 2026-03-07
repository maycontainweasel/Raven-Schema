DEFINE FUNCTION OVERWRITE fn::viewUserTypesense($UserId: any) {

	let $RID = fn::ridParam("u", $UserId);

	if !type::is_record($RID) || !record::exists($RID) {
		throw 'viewUserTypesense | expects valid $UserId record';
	};

	return SELECT
	    id,
	    email,
	    firstName,
	    surname,
	    uniqueId,
	    instances
	FROM only $RID;
};
