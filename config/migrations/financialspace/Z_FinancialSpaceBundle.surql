-- ========================================
-- Table Bundle: FinancialSpace
-- ========================================

-- ---------- FUNCTIONS ----------

-- File: F_createFinancialSpace.surql
DEFINE FUNCTION OVERWRITE fn::createFinancialSpace($payload: object) {

	if !$payload {
		throw "createFinancialSpace | payload is required";
	};

	if $payload.key = NONE || $payload.key = null || (type::is_string($payload.key) && string::len($payload.key) = 0) {
		throw "createFinancialSpace | requires key";
	};
	if $payload.name = NONE || $payload.name = null || (type::is_string($payload.name) && string::len($payload.name) = 0) {
		throw "createFinancialSpace | requires name";
	};
	if $payload.spaceType = NONE || $payload.spaceType = null || (type::is_string($payload.spaceType) && string::len($payload.spaceType) = 0) {
		throw "createFinancialSpace | requires spaceType";
	};
	if $payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len($payload.currency) = 0) {
		throw "createFinancialSpace | requires currency";
	};
	if $payload.active = NONE || $payload.active = null || (type::is_string($payload.active) && string::len($payload.active) = 0) {
		throw "createFinancialSpace | requires active";
	};

	if !($payload.spaceType IN ["personal", "business", "trading", "family", "other"]) {
		throw "createFinancialSpace | invalid spaceType";
	};

	let $defaultData = {
		key: "",
		name: "",
		spaceType: "personal",
		currency: "ZAR",
		description: "",
		active: true,
		archivedAt: null,
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $rid = type::record('financialSpace', $payload.key);
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
		throw "createFinancialSpace | failed to create financialSpace";
	};

	return if $record {
		return $record;
	} else {
		throw "createFinancialSpace | failed to create financialSpace";
	}

};

-- File: F_deleteFinancialSpace.surql
DEFINE FUNCTION OVERWRITE fn::deleteFinancialSpace($FinancialSpaceID: any) {

	let $rid = fn::ridParam("financialSpace", $FinancialSpaceID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteFinancialSpace | failed to delete FinancialSpace";
	}

};

-- File: F_updateFinancialSpace.surql
DEFINE FUNCTION OVERWRITE fn::updateFinancialSpace($FinancialSpaceID: any, $payload: object) {

	let $rid = fn::ridParam("financialSpace", $FinancialSpaceID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateFinancialSpace | payload is required";
	};

	let $current = (select * from $rid)[0];

	if $payload.spaceType != NONE {
		if !($payload.spaceType IN ["personal", "business", "trading", "family", "other"]) {
			throw "updateFinancialSpace | invalid spaceType";
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
		throw "updateFinancialSpace | failed to update FinancialSpace";
	}

};


-- ---------- EVENTS ----------

-- File: E_FinancialSpaceDelete.surql
DEFINE EVENT OVERWRITE FinancialSpaceDelete ON TABLE financialSpace WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromIn($id, 'FinancialSpaceAccounts', false);
};


-- ---------- VIEWS ----------

-- File: V_FinancialSpaceAdmin.surql
DEFINE TABLE IF NOT EXISTS financialSpace TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE FinancialSpaceAdmin TYPE NORMAL AS
SELECT
    id
FROM financialSpace;

