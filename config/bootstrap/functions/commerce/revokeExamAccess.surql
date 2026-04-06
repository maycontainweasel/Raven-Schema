DEFINE FUNCTION OVERWRITE fn::revokeExamAccess($R: object) {
	if !$R {
		throw "revokeExamAccess | expects a valid request object";
	};

	let $UID = fn::ridParam("u", $R.UID);
	if !type::is_record($UID) || !record::exists($UID) {
		throw "revokeExamAccess | expects a valid request UID";
	};

	let $EXAM_ID = fn::ridParam("exam", $R.EXAM_ID);
	if !type::is_record($EXAM_ID) || !record::exists($EXAM_ID) {
		throw "revokeExamAccess | expects a valid request EXAM_ID";
	};

	let $subscriptionID = fn::userSubscriptionID($UID, $EXAM_ID);
	if !type::is_record($subscriptionID) || !record::exists($subscriptionID) {
		return NONE;
	};

	let $subscription = select * from only $subscriptionID;
	let $accessId = type::record("uAccess", record::id($UID));
	let $metadata = if type::is_object($R.METADATA) {
		fn::objectAssign(if type::is_object($subscription.metadata) { $subscription.metadata } else { {} }, $R.METADATA)
	} else if type::is_object($subscription.metadata) {
		$subscription.metadata
	} else {
		{}
	};

	let $revoked = fn::updateUserSubscription($subscriptionID, {
		u: $UID,
		exam: $EXAM_ID,
		state: "revoked",
		source: if type::is_string($R.SOURCE) && string::len(string::trim($R.SOURCE)) > 0 { string::lowercase(string::trim($R.SOURCE)) } else { "manual" },
		last_updated: time::now(),
		metadata: $metadata,
		userSubscriptions: [$UID],
		examSubscriptions: [$EXAM_ID]
	});
	let $revoked = if type::is_array($revoked) { array::first($revoked) } else { $revoked };

	delete from Subscriptions where in = $accessId and out = $subscriptionID;

	fn::reconcileUserAccess($UID);

	return if type::is_object($revoked) {
		$revoked
	} else {
		select * from only $subscriptionID
	};
};
