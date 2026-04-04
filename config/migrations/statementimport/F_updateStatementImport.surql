DEFINE FUNCTION OVERWRITE fn::updateStatementImport($StatementImportID: any, $payload: object) {

	let $rid = fn::ridParam("statementImport", $StatementImportID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateStatementImport | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectAssign($payload, {
		space: if $payload.space = NONE { $current.space } else if type::is_array($payload.space) { $payload.space } else if $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0) { $payload.space } else { fn::ridParam("financialSpace", $payload.space) },
		account: if $payload.account = NONE { $current.account } else if type::is_array($payload.account) { $payload.account } else if $payload.account = null || (type::is_string($payload.account) && string::len(string::trim($payload.account)) = 0) { $payload.account } else { fn::ridParam("account", $payload.account) },
	});

	if !($payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0)) && (!type::is_record($payload.space) || !record::exists($payload.space)) {
		throw "updateStatementImport | space must reference an existing financialSpace record";
	};
	if !($payload.account = NONE || $payload.account = null || (type::is_string($payload.account) && string::len(string::trim($payload.account)) = 0)) && (!type::is_record($payload.account) || !record::exists($payload.account)) {
		throw "updateStatementImport | account must reference an existing account record";
	};

	if $payload.sourceFormat != NONE {
		if !($payload.sourceFormat IN ["csv", "ofx", "qif", "pdf", "manual"]) {
			throw "updateStatementImport | invalid sourceFormat";
		};
	};
	if $payload.status != NONE {
		if !($payload.status IN ["raw", "parsed", "matched", "reviewed", "error"]) {
			throw "updateStatementImport | invalid status";
		};
	};

	let $result = update $rid merge $payload;
	let $result = if type::is_array($result) { array::first($result) } else { $result };

	// --- Refresh Record views
	update $rid merge {
		"touch": 1
	};
	update $rid unset touch;

	let $PID = fn::PID($rid);

	if(type::is_record($PID) && record::exists($PID)) {
		update $PID merge {
			"touch": 1
		};
		update $PID unset touch;
	};
	// --- End Refresh Record views

	return if $result {
		return $result;
	} else {
		throw "updateStatementImport | failed to update StatementImport";
	}

};
