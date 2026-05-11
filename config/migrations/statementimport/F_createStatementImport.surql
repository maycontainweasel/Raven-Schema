DEFINE FUNCTION OVERWRITE fn::createStatementImport($payload: object) {

	if !$payload {
		throw "createStatementImport | payload is required";
	};

	if $payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len($payload.space) = 0) {
		throw "createStatementImport | requires space";
	};
	if $payload.account = NONE || $payload.account = null || (type::is_string($payload.account) && string::len($payload.account) = 0) {
		throw "createStatementImport | requires account";
	};
	if $payload.key = NONE || $payload.key = null || (type::is_string($payload.key) && string::len($payload.key) = 0) {
		throw "createStatementImport | requires key";
	};
	if $payload.sourceFileName = NONE || $payload.sourceFileName = null || (type::is_string($payload.sourceFileName) && string::len($payload.sourceFileName) = 0) {
		throw "createStatementImport | requires sourceFileName";
	};
	if $payload.sourceFormat = NONE || $payload.sourceFormat = null || (type::is_string($payload.sourceFormat) && string::len($payload.sourceFormat) = 0) {
		throw "createStatementImport | requires sourceFormat";
	};
	if $payload.importedAt = NONE || $payload.importedAt = null || (type::is_string($payload.importedAt) && string::len($payload.importedAt) = 0) {
		throw "createStatementImport | requires importedAt";
	};
	if $payload.status = NONE || $payload.status = null || (type::is_string($payload.status) && string::len($payload.status) = 0) {
		throw "createStatementImport | requires status";
	};

	if !($payload.sourceFormat IN ["csv", "ofx", "qif", "pdf", "manual"]) {
		throw "createStatementImport | invalid sourceFormat";
	};
	if !($payload.status IN ["raw", "parsed", "matched", "reviewed", "error"]) {
		throw "createStatementImport | invalid status";
	};

	let $defaultData = {
		space: "",
		account: "",
		key: "",
		sourceFileName: "",
		sourceFormat: "pdf",
		importedAt: "",
		statementDate: "",
		status: "raw",
		rowCount: 0,
		normalizedCount: 0,
		clarificationCount: 0,
		sourceChecksum: "",
		notes: "",
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $payload = fn::objectAssign($payload, {
		space: if type::is_array($payload.space) { $payload.space } else if $payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0) { $payload.space } else { fn::ridParam("financialSpace", $payload.space) },
		account: if type::is_array($payload.account) { $payload.account } else if $payload.account = NONE || $payload.account = null || (type::is_string($payload.account) && string::len(string::trim($payload.account)) = 0) { $payload.account } else { fn::ridParam("account", $payload.account) },
	});

	if !($payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0)) && (!type::is_record($payload.space) || !record::exists($payload.space)) {
		throw "createStatementImport | space must reference an existing financialSpace record";
	};
	if !($payload.account = NONE || $payload.account = null || (type::is_string($payload.account) && string::len(string::trim($payload.account)) = 0)) && (!type::is_record($payload.account) || !record::exists($payload.account)) {
		throw "createStatementImport | account must reference an existing account record";
	};

	let $rid = type::record('statementImport', $payload.key);
	let $payload = fn::objectRemove($payload, ["id"]);
	let $record = upsert $rid content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	let $record = if $record { $record } else {
		let $fallback = select * from only $rid;
		if type::is_array($fallback) { array::first($fallback) } else { $fallback };
	};

	let $recordIDSource = if type::is_object($record) && $record.id != NONE && $record.id != null {
		$record.id
	} else {
		$record
	};

	let $recordID = if $recordIDSource = NONE || $recordIDSource = null || (type::is_string($recordIDSource) && string::len(string::trim($recordIDSource)) = 0) {
		NONE
	} else {
		fn::ridParam("statementImport", $recordIDSource)
	};

	if !$recordID {
		throw "createStatementImport | failed to create statementImport";
	};

	return if $record {
		return $record;
	} else {
		throw "createStatementImport | failed to create statementImport";
	}

};

