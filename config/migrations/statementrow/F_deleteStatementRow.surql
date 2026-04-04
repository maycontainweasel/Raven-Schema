DEFINE FUNCTION OVERWRITE fn::deleteStatementRow($StatementRowID: any) {

	let $rid = fn::ridParam("statementRow", $StatementRowID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteStatementRow | failed to delete StatementRow";
	}

};
