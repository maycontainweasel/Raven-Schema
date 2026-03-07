DEFINE FUNCTION OVERWRITE fn::viewOrganisationTypesense($OrganisationId: any) {

	let $RID = fn::ridParam("organisation", $OrganisationId);

	if !type::is_record($RID) || !record::exists($RID) {
		throw 'viewOrganisationTypesense | expects valid $OrganisationId record';
	};

	return SELECT
	    id,
	    title,
	    slug,
	    description,
	    active,
	    $this.instances || [] AS instances
	FROM only $RID;
};
