DEFINE FUNCTION OVERWRITE fn::createCategory($payload: object) {

	if !$payload {
		throw "createCategory | payload is required";
	};

	if $payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len($payload.space) = 0) {
		throw "createCategory | requires space";
	};
	if $payload.key = NONE || $payload.key = null || (type::is_string($payload.key) && string::len($payload.key) = 0) {
		throw "createCategory | requires key";
	};
	if $payload.name = NONE || $payload.name = null || (type::is_string($payload.name) && string::len($payload.name) = 0) {
		throw "createCategory | requires name";
	};
	if $payload.categoryKind = NONE || $payload.categoryKind = null || (type::is_string($payload.categoryKind) && string::len($payload.categoryKind) = 0) {
		throw "createCategory | requires categoryKind";
	};
	if $payload.active = NONE || $payload.active = null || (type::is_string($payload.active) && string::len($payload.active) = 0) {
		throw "createCategory | requires active";
	};

	if !($payload.categoryKind IN ["income", "expense", "transfer", "tax", "savings", "other"]) {
		throw "createCategory | invalid categoryKind";
	};

	let $defaultData = {
		space: "",
		key: "",
		name: "",
		categoryKind: "expense",
		parentCategory: "",
		active: true,
		notes: "",
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $payload = fn::objectAssign($payload, {
		space: if type::is_array($payload.space) { $payload.space } else if $payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0) { $payload.space } else { fn::ridParam("financialSpace", $payload.space) },
		parentCategory: if type::is_array($payload.parentCategory) { $payload.parentCategory } else if $payload.parentCategory = NONE || $payload.parentCategory = null || (type::is_string($payload.parentCategory) && string::len(string::trim($payload.parentCategory)) = 0) { $payload.parentCategory } else { fn::ridParam("category", $payload.parentCategory) },
	});

	if !($payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0)) && (!type::is_record($payload.space) || !record::exists($payload.space)) {
		throw "createCategory | space must reference an existing financialSpace record";
	};
	let $payload = if !($payload.parentCategory = NONE || $payload.parentCategory = null || (type::is_string($payload.parentCategory) && string::len(string::trim($payload.parentCategory)) = 0)) && (!type::is_record($payload.parentCategory) || !record::exists($payload.parentCategory)) {
		fn::objectAssign($payload, {
			parentCategory: NONE,
		})
	} else {
		$payload
	};

	let $rid = type::record('category', $payload.key);
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
		fn::ridParam("category", $recordIDSource)
	};

	if !$recordID {
		throw "createCategory | failed to create category";
	};

	return if $record {
		return $record;
	} else {
		throw "createCategory | failed to create category";
	}

};

