DEFINE FUNCTION OVERWRITE fn::createUser($payload: object) {

	if !$payload {
		throw "createUser | payload is required";
	};

	let $payload = fn::objectRemove($payload, ["uniqueId"]);

	if !$payload.email {
		throw "createUser | requires email";
	};
	if !$payload.password {
		throw "createUser | requires password";
	};
	if !$payload.firstName {
		throw "createUser | requires firstName";
	};
	if !$payload.surname {
		throw "createUser | requires surname";
	};
	if !$payload.role {
		throw "createUser | requires role";
	};

	if !($payload.role || $payload.roles) {
		throw "createUser | requires role";
	};


	let $defaultData = {
		email: "",
		password: "",
		firstName: "",
		surname: "",
		uniqueId: "",
		role: "",
		instances: fn::defaultInstance({ returnArray: true }),
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $payload = fn::objectAssign($payload, {
		password: crypto::argon2::generate($payload.password),
		uniqueId: crypto::md5($payload.email),
	});

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
			$term
		};
		let $termPayload = { key: $term };
		type::record('t_u_role', $termPayload.key)
	});
	let $payload = fn::objectAssign($payload, {
		role: if array::len($tax_role_norm) > 0 { array::first($tax_role_norm) } else { $payload.role }
	});


	if !type::is_array($payload.instances){
		throw "createUser | requires valid instances array";
	};

	let $rid = type::record('u', $payload.email);
	let $payload = fn::objectRemove($payload, ["id"]);
	let $record = upsert $rid content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	if array::len($tax_role_norm) > 0 {
		fn::attachUserRoleTerm($rid, array::first($tax_role_norm), { skipExists: true });
	};


	return if $record {
		return $record;
	} else {
		throw "createUser | failed to create u";
	}

};

