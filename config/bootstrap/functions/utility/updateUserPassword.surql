DEFINE FUNCTION fn::updateUserPassword($UID: record, $currentPassword: string, $newPassword: string) {
	
	if !$request.UID {
		throw "updateUserPassword | expects valid UID";
	};
	
	if !$request.currentPassword {
		throw "updateUserPassword | expects valid currentPassword";
	};

	if !$request.newPassword {
		throw "updateUserPassword | expects valid newPassword";
	};
	
	let $user = select * from only $request.UID;

	if !(crypto::argon2::compare($user.password, $request.currentPassword)) {
		throw 'bad_password'
	};

	if ($request.newPassword) {
		update $user merge {
			password: crypto::argon2::generate($request.newPassword),
		};
	} else {
		throw 'bad_change_password';
	};
	
	return true;

};