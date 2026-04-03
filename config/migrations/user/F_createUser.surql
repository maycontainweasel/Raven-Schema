DEFINE FUNCTION OVERWRITE fn::createUser($payload: object) {

	if !$payload {
		throw "createUser | payload is required";
	};

	if $payload.email = NONE || $payload.email = null || (type::is_string($payload.email) && string::len($payload.email) = 0) {
		throw "createUser | requires email";
	};
	if $payload.firstName = NONE || $payload.firstName = null || (type::is_string($payload.firstName) && string::len($payload.firstName) = 0) {
		throw "createUser | requires firstName";
	};
	if $payload.surname = NONE || $payload.surname = null || (type::is_string($payload.surname) && string::len($payload.surname) = 0) {
		throw "createUser | requires surname";
	};
	if $payload.role = NONE || $payload.role = null || (type::is_string($payload.role) && string::len($payload.role) = 0) {
		throw "createUser | requires role";
	};

	if !($payload.role || $payload.roles) {
		throw "createUser | requires role";
	};


	let $defaultData = {
		email: "",
		uniqueId: "",
		firstName: "",
		surname: "",
		role: "",
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $payload = fn::objectAssign($payload, {
		uniqueId: crypto::md5($payload.email),
	});

	let $payload = fn::objectAssign($payload, {
		role: if type::is_array($payload.role) { $payload.role } else if $payload.role = NONE || $payload.role = null || (type::is_string($payload.role) && string::len(string::trim($payload.role)) = 0) { $payload.role } else { fn::ridParam("t_u_role", $payload.role) },
	});

	if !($payload.role = NONE || $payload.role = null || (type::is_string($payload.role) && string::len(string::trim($payload.role)) = 0)) && (!type::is_record($payload.role) || !record::exists($payload.role)) {
		throw "createUser | role must reference an existing t_u_role record";
	};

	let $tax_role = if type::is_array($payload.role) || $payload.role {
		$payload.role
	} else if type::is_array($payload.roles) || $payload.roles {
		$payload.roles
	} else {
		null
	};

	let $payload = fn::objectRemove($payload, ["roles"]);

	let $tax_role_list = if type::is_array($tax_role) {
		$tax_role
	} else if $tax_role {
		[$tax_role]
	} else {
		[]
	};
	let $tax_role_norm = array::map($tax_role_list, |$term| {
		if type::is_record($term) {
			type::record("t_u_role", record::id($term))
		} else {
			let $termPayload = { key: $term };
			type::record('t_u_role', $termPayload.key)
		};
	});
	let $payload = fn::objectAssign($payload, {
		role: if array::len($tax_role_norm) > 0 { array::first($tax_role_norm) } else { $payload.role }
	});


	let $rid = type::record('u', $payload.email);
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
		throw "createUser | failed to create u";
	};

	if array::len($tax_role_norm) > 0 {
		fn::attachTerm("u", "role", $recordID, array::first($tax_role_norm), { skipExists: true });
	};


	return if $record {
		return $record;
	} else {
		throw "createUser | failed to create u";
	}

};

