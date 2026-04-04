DEFINE FUNCTION OVERWRITE fn::deleteFinancialSpace($FinancialSpaceID: any) {

	let $rid = fn::ridParam("financialSpace", $FinancialSpaceID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteFinancialSpace | failed to delete FinancialSpace";
	}

};
