DEFINE FUNCTION OVERWRITE fn::deleteAccount($AccountID: any) {

	let $rid = fn::ridParam("account", $AccountID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteAccount | failed to delete Account";
	}

};
