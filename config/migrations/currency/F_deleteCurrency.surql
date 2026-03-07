DEFINE FUNCTION OVERWRITE fn::deleteCurrency($CurrencyID: any) {

	let $rid = fn::ridParam("currency", $CurrencyID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteCurrency | failed to delete Currency";
	}

};
