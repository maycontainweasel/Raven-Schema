DEFINE FUNCTION OVERWRITE fn::createClassificationRule($payload: object) {

	if !$payload {
		throw "createClassificationRule | payload is required";
	};

	if $payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len($payload.space) = 0) {
		throw "createClassificationRule | requires space";
	};
	if $payload.key = NONE || $payload.key = null || (type::is_string($payload.key) && string::len($payload.key) = 0) {
		throw "createClassificationRule | requires key";
	};
	if $payload.name = NONE || $payload.name = null || (type::is_string($payload.name) && string::len($payload.name) = 0) {
		throw "createClassificationRule | requires name";
	};
	if $payload.matcher = NONE || $payload.matcher = null || (type::is_string($payload.matcher) && string::len($payload.matcher) = 0) {
		throw "createClassificationRule | requires matcher";
	};
	if $payload.scope = NONE || $payload.scope = null || (type::is_string($payload.scope) && string::len($payload.scope) = 0) {
		throw "createClassificationRule | requires scope";
	};
	if $payload.active = NONE || $payload.active = null || (type::is_string($payload.active) && string::len($payload.active) = 0) {
		throw "createClassificationRule | requires active";
	};

	if !($payload.scope IN ["description", "merchant", "reference", "amount"]) {
		throw "createClassificationRule | invalid scope";
	};

	let $defaultData = {
		space: "",
		key: "",
		name: "",
		matcher: "",
		scope: "description",
		targetMerchant: "",
		targetCategory: "",
		priority: 0,
		active: true,
		notes: "",
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $payload = fn::objectAssign($payload, {
		space: if $payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0) { null } else { fn::ridParam("financialSpace", $payload.space) },
	});

	let $payload = fn::objectAssign($payload, {
		space: if type::is_array($payload.space) { $payload.space } else if $payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0) { $payload.space } else { fn::ridParam("financialSpace", $payload.space) },
		targetMerchant: if type::is_array($payload.targetMerchant) { $payload.targetMerchant } else if $payload.targetMerchant = NONE || $payload.targetMerchant = null || (type::is_string($payload.targetMerchant) && string::len(string::trim($payload.targetMerchant)) = 0) { $payload.targetMerchant } else { fn::ridParam("merchant", $payload.targetMerchant) },
		targetCategory: if type::is_array($payload.targetCategory) { $payload.targetCategory } else if $payload.targetCategory = NONE || $payload.targetCategory = null || (type::is_string($payload.targetCategory) && string::len(string::trim($payload.targetCategory)) = 0) { $payload.targetCategory } else { fn::ridParam("category", $payload.targetCategory) },
	});

	if !($payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0)) && (!type::is_record($payload.space) || !record::exists($payload.space)) {
		throw "createClassificationRule | space must reference an existing financialSpace record";
	};
	let $payload = if !($payload.targetMerchant = NONE || $payload.targetMerchant = null || (type::is_string($payload.targetMerchant) && string::len(string::trim($payload.targetMerchant)) = 0)) && (!type::is_record($payload.targetMerchant) || !record::exists($payload.targetMerchant)) {
		fn::objectAssign($payload, {
			targetMerchant: NONE,
		})
	} else {
		$payload
	};
	let $payload = if !($payload.targetCategory = NONE || $payload.targetCategory = null || (type::is_string($payload.targetCategory) && string::len(string::trim($payload.targetCategory)) = 0)) && (!type::is_record($payload.targetCategory) || !record::exists($payload.targetCategory)) {
		fn::objectAssign($payload, {
			targetCategory: NONE,
		})
	} else {
		$payload
	};

	let $rid = type::record('classificationRule', fn::stringID([$payload.space, $payload.key]));
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
		throw "createClassificationRule | failed to create classificationRule";
	};

	return if $record {
		return $record;
	} else {
		throw "createClassificationRule | failed to create classificationRule";
	}

};

