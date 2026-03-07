DEFINE FUNCTION OVERWRITE fn::deleteOrganisation($OrganisationID: any) {

	let $rid = fn::ridParam("organisation", $OrganisationID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteOrganisation | failed to delete Organisation";
	}

};
