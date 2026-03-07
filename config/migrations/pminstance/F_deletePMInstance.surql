DEFINE FUNCTION OVERWRITE fn::deletePMInstance($PMInstanceID: any) {

	let $rid = fn::ridParam("pmInstance", $PMInstanceID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deletePMInstance | failed to delete PMInstance";
	}

};
