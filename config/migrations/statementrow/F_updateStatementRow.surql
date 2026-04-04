DEFINE FUNCTION OVERWRITE fn::updateStatementRow($StatementRowID: any, $payload: object) {

	let $rid = fn::ridParam("statementRow", $StatementRowID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateStatementRow | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectAssign($payload, {
		space: if $payload.space = NONE { $current.space } else if type::is_array($payload.space) { $payload.space } else if $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0) { $payload.space } else { fn::ridParam("financialSpace", $payload.space) },
		account: if $payload.account = NONE { $current.account } else if type::is_array($payload.account) { $payload.account } else if $payload.account = null || (type::is_string($payload.account) && string::len(string::trim($payload.account)) = 0) { $payload.account } else { fn::ridParam("account", $payload.account) },
		statementImport: if $payload.statementImport = NONE { $current.statementImport } else if type::is_array($payload.statementImport) { $payload.statementImport } else if $payload.statementImport = null || (type::is_string($payload.statementImport) && string::len(string::trim($payload.statementImport)) = 0) { $payload.statementImport } else { fn::ridParam("statementImport", $payload.statementImport) },
		transaction: if $payload.transaction = NONE { $current.transaction } else if type::is_array($payload.transaction) { $payload.transaction } else if $payload.transaction = null || (type::is_string($payload.transaction) && string::len(string::trim($payload.transaction)) = 0) { $payload.transaction } else { fn::ridParam("transaction", $payload.transaction) },
	});

	if !($payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0)) && (!type::is_record($payload.space) || !record::exists($payload.space)) {
		throw "updateStatementRow | space must reference an existing financialSpace record";
	};
	if !($payload.account = NONE || $payload.account = null || (type::is_string($payload.account) && string::len(string::trim($payload.account)) = 0)) && (!type::is_record($payload.account) || !record::exists($payload.account)) {
		throw "updateStatementRow | account must reference an existing account record";
	};
	if !($payload.statementImport = NONE || $payload.statementImport = null || (type::is_string($payload.statementImport) && string::len(string::trim($payload.statementImport)) = 0)) && (!type::is_record($payload.statementImport) || !record::exists($payload.statementImport)) {
		throw "updateStatementRow | statementImport must reference an existing statementImport record";
	};
	let $payload = if !($payload.transaction = NONE || $payload.transaction = null || (type::is_string($payload.transaction) && string::len(string::trim($payload.transaction)) = 0)) && (!type::is_record($payload.transaction) || !record::exists($payload.transaction)) {
		fn::objectAssign($payload, {
			transaction: NONE,
		})
	} else {
		$payload
	};

	if $payload.direction != NONE {
		if !($payload.direction IN ["debit", "credit", "transfer"]) {
			throw "updateStatementRow | invalid direction";
		};
	};
	if $payload.status != NONE {
		if !($payload.status IN ["raw", "normalized", "matched", "clarified", "ignored"]) {
			throw "updateStatementRow | invalid status";
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
		throw "updateStatementRow | failed to update StatementRow";
	}

};
