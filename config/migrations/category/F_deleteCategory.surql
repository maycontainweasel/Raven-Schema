DEFINE FUNCTION OVERWRITE fn::deleteCategory($CategoryID: any) {

	let $rid = fn::ridParam("category", $CategoryID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteCategory | failed to delete Category";
	}

};
