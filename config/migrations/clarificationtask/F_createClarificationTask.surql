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
		resolvedAt: "",
		resolutionNotes: "",
		confidence: 0,
		notes: "",
	};

	let $payload = fn::objectAssign($defaultData, $payload);

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

	let $rid = type::record('clarificationTask', $payload.key);
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
		fn::ridParam("clarificationTask", $recordIDSource)
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

