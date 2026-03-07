DEFINE FUNCTION OVERWRITE fn::updateSessionCategoryRecord($SessionCategoryRecordID: any, $payload: object) {

	let $rid = fn::ridParam("scr", $SessionCategoryRecordID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateSessionCategoryRecord | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectAssign($payload, {
		s: if $payload.s = NONE { $current.s } else if type::is_array($payload.s) { $payload.s } else if $payload.s = null || (type::is_string($payload.s) && string::len(string::trim($payload.s)) = 0) { $payload.s } else { fn::ridParam("s", $payload.s) },
		category: if $payload.category = NONE { $current.category } else if type::is_array($payload.category) { $payload.category } else if $payload.category = null || (type::is_string($payload.category) && string::len(string::trim($payload.category)) = 0) { $payload.category } else { fn::ridParam("qt", $payload.category) },
	});

	if !($payload.s = NONE || $payload.s = null || (type::is_string($payload.s) && string::len(string::trim($payload.s)) = 0)) && (!type::is_record($payload.s) || !record::exists($payload.s)) {
		throw "updateSessionCategoryRecord | s must reference an existing s record";
	};
	if !($payload.category = NONE || $payload.category = null || (type::is_string($payload.category) && string::len(string::trim($payload.category)) = 0)) && (!type::is_record($payload.category) || !record::exists($payload.category)) {
		throw "updateSessionCategoryRecord | category must reference an existing qt record";
	};

	let $rel_categoryRecords = $payload.categoryRecords;

	let $payload = fn::objectRemove($payload, ["categoryRecords"]);

	let $rel_categoryRecords_norm = fn::toRecordArray('s', $rel_categoryRecords);

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

	if type::is_array($rel_categoryRecords) {
	delete from SessionCategoryRecords where out = $rid;
		for $rel in $rel_categoryRecords_norm {
			fn::createEdge($rel, "SessionCategoryRecords", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_categoryRecords {
	delete from SessionCategoryRecords where out = $rid;
		for $rel in $rel_categoryRecords_norm {
			fn::createEdge($rel, "SessionCategoryRecords", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	};


	return if $result {
		return $result;
	} else {
		throw "updateSessionCategoryRecord | failed to update SessionCategoryRecord";
	}

};
