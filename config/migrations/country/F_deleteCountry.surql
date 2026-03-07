DEFINE FUNCTION OVERWRITE fn::deleteCountry($CountryID: any) {

	let $rid = fn::ridParam("country", $CountryID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteCountry | failed to delete Country";
	}

};
