DEFINE FUNCTION OVERWRITE fn::deleteTransaction($TransactionID: any) {

	let $rid = fn::ridParam("transaction", $TransactionID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteTransaction | failed to delete Transaction";
	}

};
