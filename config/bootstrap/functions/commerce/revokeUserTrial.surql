DEFINE FUNCTION OVERWRITE fn::revokeUserTrial($UID: any) {
	let $uid = fn::ridParam("u", $UID);
	if !type::is_record($uid) || !record::exists($uid) {
		throw "revokeUserTrial | expects valid $UID";
	};

	let $trialId = type::record("uTrial", record::id($uid));
	let $accessId = type::record("uAccess", record::id($uid));

	if record::exists($trialId) {
		delete from AccessTrial where in = $accessId and out = $trialId;
		delete from UserTrial where in = $uid and out = $trialId;
		delete only $trialId;
	};

	return {
		removed: !record::exists($trialId)
	};
};
