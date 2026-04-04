DEFINE FUNCTION OVERWRITE fn::setUserAccessState($UID: any, $ACCESS: any) {
	let $uid = fn::ridParam("u", $UID);
	if !type::is_record($uid) || !record::exists($uid) {
		throw "setUserAccessState | expects valid $UID";
	};

	let $nextAccess = if type::is_string($ACCESS) {
		string::lowercase(string::trim($ACCESS))
	} else {
		""
	};
	if $nextAccess != "none" && $nextAccess != "free" && $nextAccess != "trial" && $nextAccess != "subscription" {
		throw "setUserAccessState | expects none, free, trial, or subscription";
	};

	fn::ensureUserAccess($uid);
	let $accessId = type::record("uAccess", record::id($uid));

	if $nextAccess = "none" || $nextAccess = "free" {
		fn::revokeUserTrial($uid);

		let $ownedSubscriptionIds = select value id from uSubscription
		where
			u = $uid
			and state != "revoked"
			and state != "expired";

		if type::is_array($ownedSubscriptionIds) {
			for $subscriptionId in $ownedSubscriptionIds {
				if type::is_record($subscriptionId) && record::exists($subscriptionId) {
					update only $subscriptionId merge {
						state: "revoked",
						last_updated: time::now()
					};
					delete from Subscriptions where in = $accessId and out = $subscriptionId;
				};
			};
		};
	} else if $nextAccess = "trial" {
		let $trialId = type::record("uTrial", record::id($uid));
		if !record::exists($trialId) {
			throw "setUserAccessState | cannot set trial without a valid uTrial record";
		};
	} else if $nextAccess = "subscription" {
		let $activeSubscriptionIds = select value id from uSubscription
		where
			u = $uid
			and state != "revoked"
			and state != "expired"
			and expiry_datetime > time::now();

		if !type::is_array($activeSubscriptionIds) || array::len($activeSubscriptionIds) = 0 {
			throw "setUserAccessState | cannot set subscription without an active uSubscription";
		};

		for $subscriptionId in $activeSubscriptionIds {
			let $relation = select * from Subscriptions where in = $accessId and out = $subscriptionId limit 1;
			if !array::len($relation) {
				relate only $accessId->Subscriptions->$subscriptionId;
			};
		};
	};

	update only $accessId merge {
		"access": $nextAccess,
		last_updated: time::now()
	};

	return fn::reconcileUserAccess($uid);
};
