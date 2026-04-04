-- ========================================
-- Table Bundle: Category
-- ========================================

-- ---------- FUNCTIONS ----------

-- File: F_createCategory.surql
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
		space: if $payload.space = NONE || $payload.space = null || (type::is_string($payload.space) && string::len(string::trim($payload.space)) = 0) { null } else { fn::ridParam("financialSpace", $payload.space) },
	});

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

	let $rid = type::record('category', fn::stringID([$payload.space, $payload.key]));
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
		throw "createCategory | failed to create category";
	};

	return if $record {
		return $record;
	} else {
		throw "createCategory | failed to create category";
	}

};

-- File: F_deleteCategory.surql
DEFINE FUNCTION OVERWRITE fn::deleteCategory($CategoryID: any) {

	let $rid = fn::ridParam("category", $CategoryID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteCategory | failed to delete Category";
	}

};

-- File: F_updateCategory.surql
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


-- ---------- VIEWS ----------

-- File: V_CategoryAdmin.surql
DEFINE TABLE IF NOT EXISTS category TYPE NORMAL SCHEMALESS PERMISSIONS FULL;

DEFINE TABLE OVERWRITE CategoryAdmin TYPE NORMAL AS
SELECT
    id
FROM category;

