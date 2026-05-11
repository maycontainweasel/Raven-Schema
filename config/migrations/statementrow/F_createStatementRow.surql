DEFINE FUNCTION OVERWRITE fn::createStatementRow($payload: object) {

	if !$payload {
		throw "createStatementRow | payload is required";
	};

	if $payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len($payload.space) = 0) {
		throw "createStatementRow | requires space";
	};
	if $payload.account = NONE || $payload.account = null || (type::is_string($payload.account) && string::len($payload.account) = 0) {
		throw "createStatementRow | requires account";
	};
	if $payload.statementImport = NONE || $payload.statementImport = null || (type::is_string($payload.statementImport) && string::len($payload.statementImport) = 0) {
		throw "createStatementRow | requires statementImport";
	};
	if $payload.rowNumber = NONE || $payload.rowNumber = null || (type::is_string($payload.rowNumber) && string::len($payload.rowNumber) = 0) {
		throw "createStatementRow | requires rowNumber";
	};
	if $payload.description = NONE || $payload.description = null || (type::is_string($payload.description) && string::len($payload.description) = 0) {
		throw "createStatementRow | requires description";
	};
	if $payload.amount = NONE || $payload.amount = null || (type::is_string($payload.amount) && string::len($payload.amount) = 0) {
		throw "createStatementRow | requires amount";
	};
	if $payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len($payload.currency) = 0) {
		throw "createStatementRow | requires currency";
	};
	if $payload.direction = NONE || $payload.direction = null || (type::is_string($payload.direction) && string::len($payload.direction) = 0) {
		throw "createStatementRow | requires direction";
	};
	if $payload.status = NONE || $payload.status = null || (type::is_string($payload.status) && string::len($payload.status) = 0) {
		throw "createStatementRow | requires status";
	};

	if !($payload.direction IN ["debit", "credit", "transfer"]) {
		throw "createStatementRow | invalid direction";
	};
	if !($payload.status IN ["raw", "normalized", "matched", "clarified", "ignored"]) {
		throw "createStatementRow | invalid status";
	};

	let $defaultData = {
		space: "",
		account: "",
		statementImport: "",
		rowNumber: 0,
		postedAt: "",
		description: "",
		normalizedDescription: "",
		amount: 0,
		balance: 0,
		currency: "ZAR",
		direction: "debit",
		status: "raw",
		confidence: 0,
		rawData: {},
		transaction: "",
		notes: "",
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $payload = fn::objectAssign($payload, {
		space: if type::is_array($payload.space) { $payload.space } else if $payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0) { $payload.space } else { fn::ridParam("financialSpace", $payload.space) },
		account: if type::is_array($payload.account) { $payload.account } else if $payload.account = NONE || $payload.account = null || (type::is_string($payload.account) && string::len(string::trim($payload.account)) = 0) { $payload.account } else { fn::ridParam("account", $payload.account) },
		statementImport: if type::is_array($payload.statementImport) { $payload.statementImport } else if $payload.statementImport = NONE || $payload.statementImport = null || (type::is_string($payload.statementImport) && string::len(string::trim($payload.statementImport)) = 0) { $payload.statementImport } else { fn::ridParam("statementImport", $payload.statementImport) },
		transaction: if type::is_array($payload.transaction) { $payload.transaction } else if $payload.transaction = NONE || $payload.transaction = null || (type::is_string($payload.transaction) && string::len(string::trim($payload.transaction)) = 0) { $payload.transaction } else { fn::ridParam("transaction", $payload.transaction) },
	});

	if !($payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0)) && (!type::is_record($payload.space) || !record::exists($payload.space)) {
		throw "createStatementRow | space must reference an existing financialSpace record";
	};
	if !($payload.account = NONE || $payload.account = null || (type::is_string($payload.account) && string::len(string::trim($payload.account)) = 0)) && (!type::is_record($payload.account) || !record::exists($payload.account)) {
		throw "createStatementRow | account must reference an existing account record";
	};
	if !($payload.statementImport = NONE || $payload.statementImport = null || (type::is_string($payload.statementImport) && string::len(string::trim($payload.statementImport)) = 0)) && (!type::is_record($payload.statementImport) || !record::exists($payload.statementImport)) {
		throw "createStatementRow | statementImport must reference an existing statementImport record";
	};
	let $payload = if !($payload.transaction = NONE || $payload.transaction = null || (type::is_string($payload.transaction) && string::len(string::trim($payload.transaction)) = 0)) && (!type::is_record($payload.transaction) || !record::exists($payload.transaction)) {
		fn::objectAssign($payload, {
			transaction: NONE,
		})
	} else {
		$payload
	};

	let $record = upsert statementRow content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	let $recordIDSource = if type::is_object($record) && $record.id != NONE && $record.id != null {
		$record.id
	} else {
		$record
	};

	let $recordID = if $recordIDSource = NONE || $recordIDSource = null || (type::is_string($recordIDSource) && string::len(string::trim($recordIDSource)) = 0) {
		NONE
	} else {
		fn::ridParam("statementRow", $recordIDSource)
	};

	if !$recordID {
		throw "createStatementRow | failed to create statementRow";
	};

	return if $record {
		return $record;
	} else {
		throw "createStatementRow | failed to create statementRow";
	}

};

