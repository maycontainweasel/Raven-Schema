-- ========================================
-- Table Bundle: Account
-- ========================================

-- ---------- FUNCTIONS ----------

-- File: F_createAccount.surql
DEFINE FUNCTION OVERWRITE fn::createAccount($payload: object) {

	if !$payload {
		throw "createAccount | payload is required";
	};

	if $payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len($payload.space) = 0) {
		throw "createAccount | requires space";
	};
	if $payload.key = NONE || $payload.key = null || (type::is_string($payload.key) && string::len($payload.key) = 0) {
		throw "createAccount | requires key";
	};
	if $payload.name = NONE || $payload.name = null || (type::is_string($payload.name) && string::len($payload.name) = 0) {
		throw "createAccount | requires name";
	};
	if $payload.bankName = NONE || $payload.bankName = null || (type::is_string($payload.bankName) && string::len($payload.bankName) = 0) {
		throw "createAccount | requires bankName";
	};
	if $payload.accountType = NONE || $payload.accountType = null || (type::is_string($payload.accountType) && string::len($payload.accountType) = 0) {
		throw "createAccount | requires accountType";
	};
	if $payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len($payload.currency) = 0) {
		throw "createAccount | requires currency";
	};
	if $payload.active = NONE || $payload.active = null || (type::is_string($payload.active) && string::len($payload.active) = 0) {
		throw "createAccount | requires active";
	};

	if !($payload.accountType IN ["current", "credit_card", "savings", "loan", "debt", "investment", "cash", "other"]) {
		throw "createAccount | invalid accountType";
	};

	let $defaultData = {
		space: "",
		key: "",
		name: "",
		bankName: "",
		accountType: "current",
		currency: "ZAR",
		accountNumberLast4: "",
		openingBalance: 0,
		active: true,
		notes: "",
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $payload = fn::objectAssign($payload, {
		space: if $payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0) { null } else { fn::ridParam("financialSpace", $payload.space) },
	});

	let $payload = fn::objectAssign($payload, {
		space: if type::is_array($payload.space) { $payload.space } else if $payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0) { $payload.space } else { fn::ridParam("financialSpace", $payload.space) },
	});

	if !($payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0)) && (!type::is_record($payload.space) || !record::exists($payload.space)) {
		throw "createAccount | space must reference an existing financialSpace record";
	};

	let $rid = type::record('account', fn::stringID([$payload.space, $payload.key]));
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
		throw "createAccount | failed to create account";
	};

	return if $record {
		return $record;
	} else {
		throw "createAccount | failed to create account";
	}

};

-- File: F_deleteAccount.surql
DEFINE FUNCTION OVERWRITE fn::deleteAccount($AccountID: any) {

	let $rid = fn::ridParam("account", $AccountID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteAccount | failed to delete Account";
	}

};

-- File: F_updateAccount.surql
DEFINE FUNCTION OVERWRITE fn::updateAccount($AccountID: any, $payload: object) {

	let $rid = fn::ridParam("account", $AccountID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateAccount | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectAssign($payload, {
		space: if $payload.space = NONE { $current.space } else if type::is_array($payload.space) { $payload.space } else if $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0) { $payload.space } else { fn::ridParam("financialSpace", $payload.space) },
	});

	if !($payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0)) && (!type::is_record($payload.space) || !record::exists($payload.space)) {
		throw "updateAccount | space must reference an existing financialSpace record";
	};

	if $payload.accountType != NONE {
		if !($payload.accountType IN ["current", "credit_card", "savings", "loan", "debt", "investment", "cash", "other"]) {
			throw "updateAccount | invalid accountType";
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
		throw "updateAccount | failed to update Account";
	}

};


-- ---------- EVENTS ----------

-- File: E_AccountDelete.surql
DEFINE EVENT OVERWRITE AccountDelete ON TABLE account WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromIn($id, 'AccountStatementImports', false);
  fn::deleteEdgeFromIn($id, 'AccountTransactions', false);
};


-- ---------- VIEWS ----------

-- File: V_AccountAdmin.surql
DEFINE TABLE IF NOT EXISTS account TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE AccountAdmin TYPE NORMAL AS
SELECT
    id
FROM account;

