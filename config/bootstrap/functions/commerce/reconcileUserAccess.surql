DEFINE FUNCTION OVERWRITE fn::reconcileUserAccess($UID: any) {
	let $uid = fn::ridParam("u", $UID);
	if !type::is_record($uid) || !record::exists($uid) {
		throw "reconcileUserAccess | expects valid $UID";
	};

	fn::ensureUserAccess($uid);
	let $accessId = type::record("uAccess", record::id($uid));
	let $existingAccess = select * from only $accessId;
	let $currentAccess = if $existingAccess && type::is_string($existingAccess.access) {
		string::lowercase(string::trim($existingAccess.access))
	} else {
		"none"
	};
	let $trialId = type::record("uTrial", record::id($uid));
	let $ownedSubscriptionIds = select value id from uSubscription where u = $uid;

	if type::is_array($ownedSubscriptionIds) {
		for $subscriptionId in $ownedSubscriptionIds {
			if type::is_record($subscriptionId) && record::exists($subscriptionId) {
				let $subscription = select * from only $subscriptionId;
				let $state = if $subscription && type::is_string($subscription.state) {
					string::lowercase(string::trim($subscription.state))
				} else {
					"active"
				};
				let $isRevoked = $state = "revoked";
				let $isExpired = type::is_datetime($subscription.expiry_datetime) && $subscription.expiry_datetime <= time::now();
				let $relation = select * from Subscriptions where in = $accessId and out = $subscriptionId limit 1;

				if $isExpired && !$isRevoked {
					update only $subscriptionId merge {
						state: "expired",
						last_updated: time::now()
					};
				};

				if !$isRevoked && !$isExpired {
					if !array::len($relation) {
						relate only $accessId->Subscriptions->$subscriptionId;
					};
				} else if array::len($relation) {
					delete from Subscriptions where in = $accessId and out = $subscriptionId;
				};
			};
		};
	};

	if record::exists($trialId) {
		let $userTrialRelation = select * from UserTrial where in = $uid and out = $trialId limit 1;
		if !array::len($userTrialRelation) {
			relate only $uid->UserTrial->$trialId;
		};

		let $accessTrialRelation = select * from AccessTrial where in = $accessId and out = $trialId limit 1;
		if !array::len($accessTrialRelation) {
			relate only $accessId->AccessTrial->$trialId;
		};
	} else {
		delete from AccessTrial where in = $accessId;
		delete from UserTrial where in = $uid;
	};

	let $activeSubscriptionIds = select value id from uSubscription
	where
		u = $uid
		and state != "revoked"
		and state != "expired"
		and expiry_datetime > time::now();

	let $nextAccess = if type::is_array($activeSubscriptionIds) && array::len($activeSubscriptionIds) > 0 {
		"subscription"
	} else if record::exists($trialId) {
		"trial"
	} else if $currentAccess = "free" {
		"free"
	} else {
		"none"
	};

	update only $accessId merge {
		"access": $nextAccess,
		last_updated: time::now()
	};

	return select * from only $accessId;
};
