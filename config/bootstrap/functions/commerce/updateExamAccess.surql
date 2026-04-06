DEFINE FUNCTION OVERWRITE fn::updateExamAccess($R: object) {
	if !$R {
		throw "updateExamAccess | expects a valid request object";
	};

	let $UID = fn::ridParam("u", $R.UID);
	if !type::is_record($UID) || !record::exists($UID) {
		throw "updateExamAccess | expects a valid request UID";
	};

	let $EXAM_ID = fn::ridParam("exam", $R.EXAM_ID);
	if !type::is_record($EXAM_ID) || !record::exists($EXAM_ID) {
		throw "updateExamAccess | expects a valid request EXAM_ID";
	};

	let $subscriptionID = fn::userSubscriptionID($UID, $EXAM_ID);
	if !type::is_record($subscriptionID) || !record::exists($subscriptionID) {
		throw "updateExamAccess | expects an existing subscription";
	};

	let $subscription = select * from only $subscriptionID;
	let $state = if type::is_string($subscription.state) {
		string::lowercase(string::trim($subscription.state))
	} else {
		"active"
	};
	if $state = "revoked" {
		throw "updateExamAccess | cannot update a revoked subscription";
	};

	let $nextStart = if $R.START_DATE = NONE || $R.START_DATE = null {
		$subscription.start_datetime
	} else if type::is_datetime($R.START_DATE) {
		<datetime> $R.START_DATE
	} else {
		throw "updateExamAccess | expects START_DATE to be a valid datetime";
	};

	let $nextEnd = if $R.END_DATE = NONE || $R.END_DATE = null {
		$subscription.expiry_datetime
	} else if type::is_datetime($R.END_DATE) {
		<datetime> $R.END_DATE
	} else {
		throw "updateExamAccess | expects END_DATE to be a valid datetime";
	};

	if !type::is_datetime($nextStart) || !type::is_datetime($nextEnd) {
		throw "updateExamAccess | expects a valid start and expiry datetime";
	};
	if $nextEnd < $nextStart {
		throw "updateExamAccess | END_DATE cannot be earlier than START_DATE";
	};

	let $accessId = type::record("uAccess", record::id($UID));
	let $source = if type::is_string($R.SOURCE) && string::len(string::trim($R.SOURCE)) > 0 {
		string::lowercase(string::trim($R.SOURCE))
	} else if type::is_string($subscription.source) && string::len(string::trim($subscription.source)) > 0 {
		string::lowercase(string::trim($subscription.source))
	} else {
		"manual"
	};
	let $metadata = if type::is_object($R.METADATA) {
		fn::objectAssign(if type::is_object($subscription.metadata) { $subscription.metadata } else { {} }, $R.METADATA)
	} else if type::is_object($subscription.metadata) {
		$subscription.metadata
	} else {
		{}
	};

	fn::ensureUserAccess($UID);

	let $updated = fn::updateUserSubscription($subscriptionID, {
		u: $UID,
		exam: $EXAM_ID,
		source: $source,
		state: if $nextEnd > time::now() { "active" } else { "expired" },
		start_datetime: $nextStart,
		expiry_datetime: $nextEnd,
		last_updated: time::now(),
		metadata: $metadata,
		subscriptions: [$accessId],
		userSubscriptions: [$UID],
		examSubscriptions: [$EXAM_ID]
	});
	let $updated = if type::is_array($updated) { array::first($updated) } else { $updated };

	fn::reconcileUserAccess($UID);

	return if type::is_object($updated) {
		$updated
	} else {
		select * from only $subscriptionID
	};
};
