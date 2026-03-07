DEFINE FUNCTION OVERWRITE fn::deleteSessionCategoryRecord($SessionCategoryRecordID: any) {

	let $rid = fn::ridParam("scr", $SessionCategoryRecordID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	delete from SessionCategoryRecords where out = $rid;

	return if $result {
		return $result['id'];
	} else {
		throw "deleteSessionCategoryRecord | failed to delete SessionCategoryRecord";
	}

};
