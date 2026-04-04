DEFINE FUNCTION OVERWRITE fn::createTransaction($payload: object) {

	if !$payload {
		throw "createTransaction | payload is required";
	};

	if $payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len($payload.space) = 0) {
		throw "createTransaction | requires space";
	};
	if $payload.account = NONE || $payload.account = null || (type::is_string($payload.account) && string::len($payload.account) = 0) {
		throw "createTransaction | requires account";
	};
	if $payload.key = NONE || $payload.key = null || (type::is_string($payload.key) && string::len($payload.key) = 0) {
		throw "createTransaction | requires key";
	};
	if $payload.postedAt = NONE || $payload.postedAt = null || (type::is_string($payload.postedAt) && string::len($payload.postedAt) = 0) {
		throw "createTransaction | requires postedAt";
	};
	if $payload.description = NONE || $payload.description = null || (type::is_string($payload.description) && string::len($payload.description) = 0) {
		throw "createTransaction | requires description";
	};
	if $payload.amount = NONE || $payload.amount = null || (type::is_string($payload.amount) && string::len($payload.amount) = 0) {
		throw "createTransaction | requires amount";
	};
	if $payload.currency = NONE || $payload.currency = null || (type::is_string($payload.currency) && string::len($payload.currency) = 0) {
		throw "createTransaction | requires currency";
	};
	if $payload.direction = NONE || $payload.direction = null || (type::is_string($payload.direction) && string::len($payload.direction) = 0) {
		throw "createTransaction | requires direction";
	};
	if $payload.status = NONE || $payload.status = null || (type::is_string($payload.status) && string::len($payload.status) = 0) {
		throw "createTransaction | requires status";
	};

	if !($payload.direction IN ["debit", "credit", "transfer"]) {
		throw "createTransaction | invalid direction";
	};
	if !($payload.status IN ["imported", "normalized", "matched", "classified", "clarified", "ignored"]) {
		throw "createTransaction | invalid status";
	};

	let $defaultData = {
		space: "",
		account: "",
		key: "",
		sourceRow: "",
		postedAt: "",
		effectiveAt: null,
		description: "",
		normalizedDescription: "",
		amount: 0,
		balance: 0,
		currency: "ZAR",
		direction: "debit",
		status: "normalized",
		confidence: 0,
		merchantName: "",
		merchant: "",
		category: "",
		isTransfer: false,
		manualOverride: false,
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
		sourceRow: if type::is_array($payload.sourceRow) { $payload.sourceRow } else if $payload.sourceRow = NONE || $payload.sourceRow = null || (type::is_string($payload.sourceRow) && string::len(string::trim($payload.sourceRow)) = 0) { $payload.sourceRow } else { fn::ridParam("statementRow", $payload.sourceRow) },
		merchant: if type::is_array($payload.merchant) { $payload.merchant } else if $payload.merchant = NONE || $payload.merchant = null || (type::is_string($payload.merchant) && string::len(string::trim($payload.merchant)) = 0) { $payload.merchant } else { fn::ridParam("merchant", $payload.merchant) },
		category: if type::is_array($payload.category) { $payload.category } else if $payload.category = NONE || $payload.category = null || (type::is_string($payload.category) && string::len(string::trim($payload.category)) = 0) { $payload.category } else { fn::ridParam("category", $payload.category) },
	});

	if !($payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0)) && (!type::is_record($payload.space) || !record::exists($payload.space)) {
		throw "createTransaction | space must reference an existing financialSpace record";
	};
	if !($payload.account = NONE || $payload.account = null || (type::is_string($payload.account) && string::len(string::trim($payload.account)) = 0)) && (!type::is_record($payload.account) || !record::exists($payload.account)) {
		throw "createTransaction | account must reference an existing account record";
	};
	let $payload = if !($payload.sourceRow = NONE || $payload.sourceRow = null || (type::is_string($payload.sourceRow) && string::len(string::trim($payload.sourceRow)) = 0)) && (!type::is_record($payload.sourceRow) || !record::exists($payload.sourceRow)) {
		fn::objectAssign($payload, {
			sourceRow: NONE,
		})
	} else {
		$payload
	};
	let $payload = if !($payload.merchant = NONE || $payload.merchant = null || (type::is_string($payload.merchant) && string::len(string::trim($payload.merchant)) = 0)) && (!type::is_record($payload.merchant) || !record::exists($payload.merchant)) {
		fn::objectAssign($payload, {
			merchant: NONE,
		})
	} else {
		$payload
	};
	let $payload = if !($payload.category = NONE || $payload.category = null || (type::is_string($payload.category) && string::len(string::trim($payload.category)) = 0)) && (!type::is_record($payload.category) || !record::exists($payload.category)) {
		fn::objectAssign($payload, {
			category: NONE,
		})
	} else {
		$payload
	};

	let $rid = type::record('transaction', fn::stringID([$payload.account, $payload.key]));
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
		throw "createTransaction | failed to create transaction";
	};

	return if $record {
		return $record;
	} else {
		throw "createTransaction | failed to create transaction";
	}

};

