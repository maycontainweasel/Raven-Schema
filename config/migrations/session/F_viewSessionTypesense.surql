DEFINE FUNCTION OVERWRITE fn::viewSessionTypesense($SessionId: any) {

	let $RID = fn::ridParam("s", $SessionId);

	if !type::is_record($RID) || !record::exists($RID) {
		throw 'viewSessionTypesense | expects valid $SessionId record';
	};

	return SELECT
	    id,
	    title,
	    mode,
	    state,
	    dateCreated,
	    dateLastActive,
	    qTotal,
	    u,
	    exams
	FROM only $RID;
};
