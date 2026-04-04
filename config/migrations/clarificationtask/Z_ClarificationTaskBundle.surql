-- ========================================
-- Table Bundle: ClarificationTask
-- ========================================

-- ---------- FUNCTIONS ----------

-- File: F_createClarificationTask.surql
DEFINE FUNCTION OVERWRITE fn::createClarificationTask($payload: object) {

	if !$payload {
		throw "createClarificationTask | payload is required";
	};

	if $payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len($payload.space) = 0) {
		throw "createClarificationTask | requires space";
	};
	if $payload.key = NONE || $payload.key = null || (type::is_string($payload.key) && string::len($payload.key) = 0) {
		throw "createClarificationTask | requires key";
	};
	if $payload.transaction = NONE || $payload.transaction = null || (type::is_string($payload.transaction) && string::len($payload.transaction) = 0) {
		throw "createClarificationTask | requires transaction";
	};
	if $payload.status = NONE || $payload.status = null || (type::is_string($payload.status) && string::len($payload.status) = 0) {
		throw "createClarificationTask | requires status";
	};
	if $payload.question = NONE || $payload.question = null || (type::is_string($payload.question) && string::len($payload.question) = 0) {
		throw "createClarificationTask | requires question";
	};

	if !($payload.status IN ["open", "suggested", "resolved", "dismissed"]) {
		throw "createClarificationTask | invalid status";
	};

	let $defaultData = {
		space: "",
		key: "",
		transaction: "",
		status: "open",
		question: "",
		reason: "",
		suggestedSpace: "",
		suggestedMerchant: "",
		suggestedCategory: "",
		resolvedAt: null,
		resolutionNotes: "",
		confidence: 0,
		notes: "",
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $payload = fn::objectAssign($payload, {
		space: if $payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0) { null } else { fn::ridParam("financialSpace", $payload.space) },
		transaction: if $payload.transaction = NONE || $payload.transaction = null || (type::is_string($payload.transaction) && string::len(string::trim($payload.transaction)) = 0) { null } else { fn::ridParam("transaction", $payload.transaction) },
	});

	let $payload = fn::objectAssign($payload, {
		space: if type::is_array($payload.space) { $payload.space } else if $payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0) { $payload.space } else { fn::ridParam("financialSpace", $payload.space) },
		transaction: if type::is_array($payload.transaction) { $payload.transaction } else if $payload.transaction = NONE || $payload.transaction = null || (type::is_string($payload.transaction) && string::len(string::trim($payload.transaction)) = 0) { $payload.transaction } else { fn::ridParam("transaction", $payload.transaction) },
		suggestedSpace: if type::is_array($payload.suggestedSpace) { $payload.suggestedSpace } else if $payload.suggestedSpace = NONE || $payload.suggestedSpace = null || (type::is_string($payload.suggestedSpace) && string::len(string::trim($payload.suggestedSpace)) = 0) { $payload.suggestedSpace } else { fn::ridParam("financialSpace", $payload.suggestedSpace) },
		suggestedMerchant: if type::is_array($payload.suggestedMerchant) { $payload.suggestedMerchant } else if $payload.suggestedMerchant = NONE || $payload.suggestedMerchant = null || (type::is_string($payload.suggestedMerchant) && string::len(string::trim($payload.suggestedMerchant)) = 0) { $payload.suggestedMerchant } else { fn::ridParam("merchant", $payload.suggestedMerchant) },
		suggestedCategory: if type::is_array($payload.suggestedCategory) { $payload.suggestedCategory } else if $payload.suggestedCategory = NONE || $payload.suggestedCategory = null || (type::is_string($payload.suggestedCategory) && string::len(string::trim($payload.suggestedCategory)) = 0) { $payload.suggestedCategory } else { fn::ridParam("category", $payload.suggestedCategory) },
	});

	if !($payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0)) && (!type::is_record($payload.space) || !record::exists($payload.space)) {
		throw "createClarificationTask | space must reference an existing financialSpace record";
	};
	if !($payload.transaction = NONE || $payload.transaction = null || (type::is_string($payload.transaction) && string::len(string::trim($payload.transaction)) = 0)) && (!type::is_record($payload.transaction) || !record::exists($payload.transaction)) {
		throw "createClarificationTask | transaction must reference an existing transaction record";
	};
	let $payload = if !($payload.suggestedSpace = NONE || $payload.suggestedSpace = null || (type::is_string($payload.suggestedSpace) && string::len(string::trim($payload.suggestedSpace)) = 0)) && (!type::is_record($payload.suggestedSpace) || !record::exists($payload.suggestedSpace)) {
		fn::objectAssign($payload, {
			suggestedSpace: NONE,
		})
	} else {
		$payload
	};
	let $payload = if !($payload.suggestedMerchant = NONE || $payload.suggestedMerchant = null || (type::is_string($payload.suggestedMerchant) && string::len(string::trim($payload.suggestedMerchant)) = 0)) && (!type::is_record($payload.suggestedMerchant) || !record::exists($payload.suggestedMerchant)) {
		fn::objectAssign($payload, {
			suggestedMerchant: NONE,
		})
	} else {
		$payload
	};
	let $payload = if !($payload.suggestedCategory = NONE || $payload.suggestedCategory = null || (type::is_string($payload.suggestedCategory) && string::len(string::trim($payload.suggestedCategory)) = 0)) && (!type::is_record($payload.suggestedCategory) || !record::exists($payload.suggestedCategory)) {
		fn::objectAssign($payload, {
			suggestedCategory: NONE,
		})
	} else {
		$payload
	};

	let $rid = type::record('clarificationTask', fn::stringID([$payload.space, $payload.key]));
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
		throw "createClarificationTask | failed to create clarificationTask";
	};

	return if $record {
		return $record;
	} else {
		throw "createClarificationTask | failed to create clarificationTask";
	}

};

-- File: F_deleteClarificationTask.surql
DEFINE FUNCTION OVERWRITE fn::deleteClarificationTask($ClarificationTaskID: any) {

	let $rid = fn::ridParam("clarificationTask", $ClarificationTaskID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteClarificationTask | failed to delete ClarificationTask";
	}

};

-- File: F_updateClarificationTask.surql
DEFINE FUNCTION OVERWRITE fn::updateClarificationTask($ClarificationTaskID: any, $payload: object) {

	let $rid = fn::ridParam("clarificationTask", $ClarificationTaskID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateClarificationTask | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectAssign($payload, {
		space: if $payload.space = NONE { $current.space } else if type::is_array($payload.space) { $payload.space } else if $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0) { $payload.space } else { fn::ridParam("financialSpace", $payload.space) },
		transaction: if $payload.transaction = NONE { $current.transaction } else if type::is_array($payload.transaction) { $payload.transaction } else if $payload.transaction = null || (type::is_string($payload.transaction) && string::len(string::trim($payload.transaction)) = 0) { $payload.transaction } else { fn::ridParam("transaction", $payload.transaction) },
		suggestedSpace: if $payload.suggestedSpace = NONE { $current.suggestedSpace } else if type::is_array($payload.suggestedSpace) { $payload.suggestedSpace } else if $payload.suggestedSpace = null || (type::is_string($payload.suggestedSpace) && string::len(string::trim($payload.suggestedSpace)) = 0) { $payload.suggestedSpace } else { fn::ridParam("financialSpace", $payload.suggestedSpace) },
		suggestedMerchant: if $payload.suggestedMerchant = NONE { $current.suggestedMerchant } else if type::is_array($payload.suggestedMerchant) { $payload.suggestedMerchant } else if $payload.suggestedMerchant = null || (type::is_string($payload.suggestedMerchant) && string::len(string::trim($payload.suggestedMerchant)) = 0) { $payload.suggestedMerchant } else { fn::ridParam("merchant", $payload.suggestedMerchant) },
		suggestedCategory: if $payload.suggestedCategory = NONE { $current.suggestedCategory } else if type::is_array($payload.suggestedCategory) { $payload.suggestedCategory } else if $payload.suggestedCategory = null || (type::is_string($payload.suggestedCategory) && string::len(string::trim($payload.suggestedCategory)) = 0) { $payload.suggestedCategory } else { fn::ridParam("category", $payload.suggestedCategory) },
	});

	if !($payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0)) && (!type::is_record($payload.space) || !record::exists($payload.space)) {
		throw "updateClarificationTask | space must reference an existing financialSpace record";
	};
	if !($payload.transaction = NONE || $payload.transaction = null || (type::is_string($payload.transaction) && string::len(string::trim($payload.transaction)) = 0)) && (!type::is_record($payload.transaction) || !record::exists($payload.transaction)) {
		throw "updateClarificationTask | transaction must reference an existing transaction record";
	};
	let $payload = if !($payload.suggestedSpace = NONE || $payload.suggestedSpace = null || (type::is_string($payload.suggestedSpace) && string::len(string::trim($payload.suggestedSpace)) = 0)) && (!type::is_record($payload.suggestedSpace) || !record::exists($payload.suggestedSpace)) {
		fn::objectAssign($payload, {
			suggestedSpace: NONE,
		})
	} else {
		$payload
	};
	let $payload = if !($payload.suggestedMerchant = NONE || $payload.suggestedMerchant = null || (type::is_string($payload.suggestedMerchant) && string::len(string::trim($payload.suggestedMerchant)) = 0)) && (!type::is_record($payload.suggestedMerchant) || !record::exists($payload.suggestedMerchant)) {
		fn::objectAssign($payload, {
			suggestedMerchant: NONE,
		})
	} else {
		$payload
	};
	let $payload = if !($payload.suggestedCategory = NONE || $payload.suggestedCategory = null || (type::is_string($payload.suggestedCategory) && string::len(string::trim($payload.suggestedCategory)) = 0)) && (!type::is_record($payload.suggestedCategory) || !record::exists($payload.suggestedCategory)) {
		fn::objectAssign($payload, {
			suggestedCategory: NONE,
		})
	} else {
		$payload
	};

	if $payload.status != NONE {
		if !($payload.status IN ["open", "suggested", "resolved", "dismissed"]) {
			throw "updateClarificationTask | invalid status";
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
		throw "updateClarificationTask | failed to update ClarificationTask";
	}

};


-- ---------- VIEWS ----------

-- File: V_ClarificationTaskAdmin.surql
DEFINE TABLE IF NOT EXISTS clarificationTask TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE ClarificationTaskAdmin TYPE NORMAL AS
SELECT
    id
FROM clarificationTask;

