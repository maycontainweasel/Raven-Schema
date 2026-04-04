DEFINE FUNCTION OVERWRITE fn::updateCategory($CategoryID: any, $payload: object) {

	let $rid = fn::ridParam("category", $CategoryID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateCategory | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectAssign($payload, {
		space: if $payload.space = NONE { $current.space } else if type::is_array($payload.space) { $payload.space } else if $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0) { $payload.space } else { fn::ridParam("financialSpace", $payload.space) },
		parentCategory: if $payload.parentCategory = NONE { $current.parentCategory } else if type::is_array($payload.parentCategory) { $payload.parentCategory } else if $payload.parentCategory = null || (type::is_string($payload.parentCategory) && string::len(string::trim($payload.parentCategory)) = 0) { $payload.parentCategory } else { fn::ridParam("category", $payload.parentCategory) },
	});

	if !($payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0)) && (!type::is_record($payload.space) || !record::exists($payload.space)) {
		throw "updateCategory | space must reference an existing financialSpace record";
	};
	let $payload = if !($payload.parentCategory = NONE || $payload.parentCategory = null || (type::is_string($payload.parentCategory) && string::len(string::trim($payload.parentCategory)) = 0)) && (!type::is_record($payload.parentCategory) || !record::exists($payload.parentCategory)) {
		fn::objectAssign($payload, {
			parentCategory: NONE,
		})
	} else {
		$payload
	};

	if $payload.categoryKind != NONE {
		if !($payload.categoryKind IN ["income", "expense", "transfer", "tax", "savings", "other"]) {
			throw "updateCategory | invalid categoryKind";
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
		throw "updateCategory | failed to update Category";
	}

};
