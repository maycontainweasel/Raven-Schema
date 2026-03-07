DEFINE FUNCTION OVERWRITE fn::viewProductTypesense($ProductId: any) {

	let $RID = fn::ridParam("product", $ProductId);

	if !type::is_record($RID) || !record::exists($RID) {
		throw 'viewProductTypesense | expects valid $ProductId record';
	};

	return SELECT
	    id,
	    key,
	    slug,
	    title,
	    description,
	    stripePID,
	    $this.instances || [] AS instances
	FROM only $RID;
};
