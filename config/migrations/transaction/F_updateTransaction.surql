DEFINE FUNCTION OVERWRITE fn::updateTransaction($TransactionID: any, $payload: object) {

	let $rid = fn::ridParam("transaction", $TransactionID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateTransaction | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectAssign($payload, {
		space: if $payload.space = NONE { $current.space } else if type::is_array($payload.space) { $payload.space } else if $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0) { $payload.space } else { fn::ridParam("financialSpace", $payload.space) },
		account: if $payload.account = NONE { $current.account } else if type::is_array($payload.account) { $payload.account } else if $payload.account = null || (type::is_string($payload.account) && string::len(string::trim($payload.account)) = 0) { $payload.account } else { fn::ridParam("account", $payload.account) },
		sourceRow: if $payload.sourceRow = NONE { $current.sourceRow } else if type::is_array($payload.sourceRow) { $payload.sourceRow } else if $payload.sourceRow = null || (type::is_string($payload.sourceRow) && string::len(string::trim($payload.sourceRow)) = 0) { $payload.sourceRow } else { fn::ridParam("statementRow", $payload.sourceRow) },
		merchant: if $payload.merchant = NONE { $current.merchant } else if type::is_array($payload.merchant) { $payload.merchant } else if $payload.merchant = null || (type::is_string($payload.merchant) && string::len(string::trim($payload.merchant)) = 0) { $payload.merchant } else { fn::ridParam("merchant", $payload.merchant) },
		category: if $payload.category = NONE { $current.category } else if type::is_array($payload.category) { $payload.category } else if $payload.category = null || (type::is_string($payload.category) && string::len(string::trim($payload.category)) = 0) { $payload.category } else { fn::ridParam("category", $payload.category) },
	});

	if !($payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0)) && (!type::is_record($payload.space) || !record::exists($payload.space)) {
		throw "updateTransaction | space must reference an existing financialSpace record";
	};
	if !($payload.account = NONE || $payload.account = null || (type::is_string($payload.account) && string::len(string::trim($payload.account)) = 0)) && (!type::is_record($payload.account) || !record::exists($payload.account)) {
		throw "updateTransaction | account must reference an existing account record";
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

	if $payload.direction != NONE {
		if !($payload.direction IN ["debit", "credit", "transfer"]) {
			throw "updateTransaction | invalid direction";
		};
	};
	if $payload.status != NONE {
		if !($payload.status IN ["imported", "normalized", "matched", "classified", "clarified", "ignored"]) {
			throw "updateTransaction | invalid status";
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
		throw "updateTransaction | failed to update Transaction";
	}

};
