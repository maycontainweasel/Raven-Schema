DEFINE FUNCTION OVERWRITE fn::updateUser($UserID: any, $payload: object) {

	let $rid = fn::ridParam("u", $UserID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateUser | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectAssign($payload, {
		role: if $payload.role = NONE { $current.role } else if type::is_array($payload.role) { $payload.role } else if $payload.role = null || (type::is_string($payload.role) && string::len(string::trim($payload.role)) = 0) { $payload.role } else { fn::ridParam("t_u_role", $payload.role) },
	});

	if !($payload.role = NONE || $payload.role = null || (type::is_string($payload.role) && string::len(string::trim($payload.role)) = 0)) && (!type::is_record($payload.role) || !record::exists($payload.role)) {
		throw "updateUser | role must reference an existing t_u_role record";
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
		role: if type::is_array($tax_role) || $tax_role {
			if array::len($tax_role_norm) > 0 { array::first($tax_role_norm) } else { $tax_role }
		} else {
			$payload.role
		}
	});


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

	if type::is_array($tax_role) {
		delete from UserRoles where in = $rid;
		if array::len($tax_role_norm) > 0 {
			fn::attachTerm("u", "role", $rid, array::first($tax_role_norm), {});
		};
	} else if $tax_role {
		delete from UserRoles where in = $rid;
		if array::len($tax_role_norm) > 0 {
			fn::attachTerm("u", "role", $rid, array::first($tax_role_norm), {});
		};
	};


	return if $result {
		return $result;
	} else {
		throw "updateUser | failed to update User";
	}

};
