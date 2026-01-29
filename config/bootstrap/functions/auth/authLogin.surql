DEFINE FUNCTION fn::authLogin($request: object) {
		
	if !$request.email {
		THROW "authLogin | requires email"; 
	};

	if !$request.password {
		THROW "authLogin | requires password"; 
	};

	let $UID = type::record("u", $request.email);

	if !type::is_record($UID) || !record::exists($UID) {
		throw "no_user";
	};

	let $user = select value id from only $UID fetch role;

	if (!$user) {
		throw "authLogin | problem fetching the user";
	};
	
	if (!crypto::argon2::compare($user.password, $request.password)) {
		throw 'bad_password'
	};
	
	return $user;

};