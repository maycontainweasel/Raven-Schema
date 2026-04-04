DEFINE FUNCTION OVERWRITE fn::deleteStatementImport($StatementImportID: any) {

	let $rid = fn::ridParam("statementImport", $StatementImportID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteStatementImport | failed to delete StatementImport";
	}

};
