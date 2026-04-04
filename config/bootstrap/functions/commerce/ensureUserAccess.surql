DEFINE FUNCTION OVERWRITE fn::ensureUserAccess($UID: any) {
	let $uid = fn::ridParam("u", $UID);
	if !type::is_record($uid) || !record::exists($uid) {
		throw "ensureUserAccess | expects valid $UID";
	};

	let $accessId = type::record("uAccess", record::id($uid));
	let $existing = select * from only $accessId;
	let $rawAccess = if $existing && type::is_string($existing.access) {
		string::lowercase(string::trim($existing.access))
	} else {
		""
	};
	let $nextAccess = if $rawAccess = "trial" {
		"trial"
	} else if $rawAccess = "subscription" {
		"subscription"
	} else if $rawAccess = "free" {
		"free"
	} else {
		"none"
	};

	upsert only $accessId merge {
		"access": $nextAccess,
		last_updated: time::now()
	};

	let $trialId = type::record("uTrial", record::id($uid));
	if record::exists($trialId) {
		let $userTrialRelation = select * from UserTrial where in = $uid and out = $trialId limit 1;
		if !array::len($userTrialRelation) {
			relate only $uid->UserTrial->$trialId;
		};

		let $accessTrialRelation = select * from AccessTrial where in = $accessId and out = $trialId limit 1;
		if !array::len($accessTrialRelation) {
			relate only $accessId->AccessTrial->$trialId;
		};
	};

	return select * from only $accessId;
};
