DEFINE FUNCTION OVERWRITE fn::deleteInstance($InstanceID: any) {

	let $rid = fn::ridParam("instance", $InstanceID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	delete from Post where out = $rid;
	let $PID = fn::PID($rid);
	if type::is_record($PID) && record::exists($PID) {
		fn::deletePost($PID);
	};

	return if $result {
		return $result['id'];
	} else {
		throw "deleteInstance | failed to delete Instance";
	}

};
