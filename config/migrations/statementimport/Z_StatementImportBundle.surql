-- ========================================
-- Table Bundle: StatementImport
-- ========================================

-- ---------- FUNCTIONS ----------

-- File: F_createStatementImport.surql
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
		sourceFormat: "csv",
		importedAt: time::now(),
		statementDate: null,
		status: "raw",
		rowCount: 0,
		normalizedCount: 0,
		clarificationCount: 0,
		sourceChecksum: "",
		notes: "",
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $payload = fn::objectAssign($payload, {
		space: if $payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0) { null } else { fn::ridParam("financialSpace", $payload.space) },
		account: if $payload.account = NONE || $payload.account = null || (type::is_string($payload.account) && string::len(string::trim($payload.account)) = 0) { null } else { fn::ridParam("account", $payload.account) },
	});

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

	let $rid = type::record('statementImport', fn::stringID([$payload.account, $payload.key]));
	let $payload = fn::objectRemove($payload, ["id"]);
	let $record = upsert $rid content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	let $record = if $record { $record } else {
		let $fallback = select * from only $rid;
		if type::is_array($fallback) { array::first($fallback) } else { $fallback };
	};

	let $recordID = if type::is_object($record) && type::is_record($record.id) {
		$record.id
	} else if type::is_record($record) {
		$record
	} else {
		null
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

-- File: F_deleteStatementImport.surql
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

-- File: F_updateStatementImport.surql
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


-- ---------- EVENTS ----------

-- File: E_StatementImportDelete.surql
DEFINE EVENT OVERWRITE StatementImportDelete ON TABLE statementImport WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromIn($id, 'StatementImportRows', false);
};


-- ---------- VIEWS ----------

-- File: V_StatementImportAdmin.surql
DEFINE TABLE IF NOT EXISTS statementImport TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE StatementImportAdmin TYPE NORMAL AS
SELECT
    id
FROM statementImport;

