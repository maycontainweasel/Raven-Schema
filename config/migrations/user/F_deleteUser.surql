DEFINE FUNCTION OVERWRITE fn::deleteUser($UserID: any) {

	let $rid = fn::ridParam("u", $UserID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	delete from UserRoles where in = $rid;

	return if $result {
		return $result['id'];
	} else {
		throw "deleteUser | failed to delete User";
	}

};
