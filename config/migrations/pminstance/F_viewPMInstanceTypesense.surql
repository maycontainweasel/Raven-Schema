DEFINE FUNCTION OVERWRITE fn::viewPMInstanceTypesense($PMInstanceId: any) {

	let $RID = fn::ridParam("pmInstance", $PMInstanceId);

	if !type::is_record($RID) || !record::exists($RID) {
		throw 'viewPMInstanceTypesense | expects valid $PMInstanceId record';
	};

	return SELECT
	    id,
	    key,
	    title,
	    status
	FROM only $RID;
};
