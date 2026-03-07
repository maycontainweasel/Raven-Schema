DEFINE FUNCTION OVERWRITE fn::createCurrency($payload: object) {

	if !$payload {
		throw "createCurrency | payload is required";
	};

	if $payload.key = NONE || $payload.key = null || (type::is_string($payload.key) && string::len($payload.key) = 0) {
		throw "createCurrency | requires key";
	};
	if $payload.label = NONE || $payload.label = null || (type::is_string($payload.label) && string::len($payload.label) = 0) {
		throw "createCurrency | requires label";
	};
	if $payload.code = NONE || $payload.code = null || (type::is_string($payload.code) && string::len($payload.code) = 0) {
		throw "createCurrency | requires code";
	};
	if $payload.symbol = NONE || $payload.symbol = null || (type::is_string($payload.symbol) && string::len($payload.symbol) = 0) {
		throw "createCurrency | requires symbol";
	};

	let $defaultData = {
		key: "",
		label: "",
		code: "",
		symbol: "",
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $rid = type::record('currency', $payload.key);
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
		throw "createCurrency | failed to create currency";
	};

	return if $record {
		return $record;
	} else {
		throw "createCurrency | failed to create currency";
	}

};

