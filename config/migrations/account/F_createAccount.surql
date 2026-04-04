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

