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
		archivedAt: "",
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

	let $recordIDSource = if type::is_object($record) && $record.id != NONE && $record.id != null {
		$record.id
	} else {
		$record
	};

	let $recordID = if $recordIDSource = NONE || $recordIDSource = null || (type::is_string($recordIDSource) && string::len(string::trim($recordIDSource)) = 0) {
		NONE
	} else {
		fn::ridParam("financialSpace", $recordIDSource)
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

