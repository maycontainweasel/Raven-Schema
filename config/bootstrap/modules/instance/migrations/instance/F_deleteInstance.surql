DEFINE FUNCTION OVERWRITE fn::deleteInstance($InstanceID: any) {

	let $rid = fn::ridParam("instance", $InstanceID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteInstance | failed to delete Instance";
	}

};
