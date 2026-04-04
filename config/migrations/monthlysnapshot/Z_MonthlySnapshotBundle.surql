-- ========================================
-- Table Bundle: MonthlySnapshot
-- ========================================

-- ---------- FUNCTIONS ----------

-- File: F_createMonthlySnapshot.surql
DEFINE FUNCTION OVERWRITE fn::createMonthlySnapshot($payload: object) {

	if !$payload {
		throw "createMonthlySnapshot | payload is required";
	};

	if $payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len($payload.space) = 0) {
		throw "createMonthlySnapshot | requires space";
	};
	if $payload.month = NONE || $payload.month = null || (type::is_string($payload.month) && string::len($payload.month) = 0) {
		throw "createMonthlySnapshot | requires month";
	};
	if $payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len($payload.currency) = 0) {
		throw "createMonthlySnapshot | requires currency";
	};
	if $payload.incomeTotal = NONE || $payload.incomeTotal = null || (type::is_string($payload.incomeTotal) && string::len($payload.incomeTotal) = 0) {
		throw "createMonthlySnapshot | requires incomeTotal";
	};
	if $payload.outflowTotal = NONE || $payload.outflowTotal = null || (type::is_string($payload.outflowTotal) && string::len($payload.outflowTotal) = 0) {
		throw "createMonthlySnapshot | requires outflowTotal";
	};
	if $payload.netTotal = NONE || $payload.netTotal = null || (type::is_string($payload.netTotal) && string::len($payload.netTotal) = 0) {
		throw "createMonthlySnapshot | requires netTotal";
	};
	if $payload.generatedAt = NONE || $payload.generatedAt = null || (type::is_string($payload.generatedAt) && string::len($payload.generatedAt) = 0) {
		throw "createMonthlySnapshot | requires generatedAt";
	};
	if $payload.status = NONE || $payload.status = null || (type::is_string($payload.status) && string::len($payload.status) = 0) {
		throw "createMonthlySnapshot | requires status";
	};

	if !($payload.status IN ["draft", "final"]) {
		throw "createMonthlySnapshot | invalid status";
	};

	let $defaultData = {
		space: "",
		month: "",
		currency: "ZAR",
		incomeTotal: 0,
		outflowTotal: 0,
		netTotal: 0,
		transferTotal: 0,
		cashAvailable: 0,
		recurringTotal: 0,
		businessSpendTotal: 0,
		personalSpendTotal: 0,
		generatedAt: time::now(),
		status: "draft",
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
		throw "createMonthlySnapshot | space must reference an existing financialSpace record";
	};

	let $rid = type::record('monthlySnapshot', fn::stringID([$payload.space, $payload.month]));
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
		throw "createMonthlySnapshot | failed to create monthlySnapshot";
	};

	return if $record {
		return $record;
	} else {
		throw "createMonthlySnapshot | failed to create monthlySnapshot";
	}

};

-- File: F_deleteMonthlySnapshot.surql
DEFINE FUNCTION OVERWRITE fn::deleteMonthlySnapshot($MonthlySnapshotID: any) {

	let $rid = fn::ridParam("monthlySnapshot", $MonthlySnapshotID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteMonthlySnapshot | failed to delete MonthlySnapshot";
	}

};

-- File: F_updateMonthlySnapshot.surql
DEFINE FUNCTION OVERWRITE fn::updateMonthlySnapshot($MonthlySnapshotID: any, $payload: object) {

	let $rid = fn::ridParam("monthlySnapshot", $MonthlySnapshotID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateMonthlySnapshot | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectAssign($payload, {
		space: if $payload.space = NONE { $current.space } else if type::is_array($payload.space) { $payload.space } else if $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0) { $payload.space } else { fn::ridParam("financialSpace", $payload.space) },
	});

	if !($payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0)) && (!type::is_record($payload.space) || !record::exists($payload.space)) {
		throw "updateMonthlySnapshot | space must reference an existing financialSpace record";
	};

	if $payload.status != NONE {
		if !($payload.status IN ["draft", "final"]) {
			throw "updateMonthlySnapshot | invalid status";
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
		throw "updateMonthlySnapshot | failed to update MonthlySnapshot";
	}

};


-- ---------- VIEWS ----------

-- File: V_MonthlySnapshotAdmin.surql
DEFINE TABLE IF NOT EXISTS monthlySnapshot TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE MonthlySnapshotAdmin TYPE NORMAL AS
SELECT
    id
FROM monthlySnapshot;

