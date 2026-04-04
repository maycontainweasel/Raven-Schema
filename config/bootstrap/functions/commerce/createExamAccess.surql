DEFINE FUNCTION OVERWRITE fn::createExamAccess($R: object) {
	if !$R {
		throw "createExamAccess | expects a valid request object";
	};

	let $UID = fn::ridParam("u", $R.UID);
	if !type::is_record($UID) || !record::exists($UID) {
		throw "createExamAccess | expects a valid request UID";
	};

	let $EXAM_ID = fn::ridParam("exam", $R.EXAM_ID);
	if !type::is_record($EXAM_ID) || !record::exists($EXAM_ID) {
		throw "createExamAccess | expects a valid request EXAM_ID";
	};

	if !$R.START_DATE || !type::is_datetime($R.START_DATE) {
		throw "createExamAccess | expects a valid date START_DATE";
	};

	if !$R.END_DATE || !type::is_datetime($R.END_DATE) {
		throw "createExamAccess | expects a valid date END_DATE";
	};

	let $PRODUCT_ID = if $R.PRODUCT_ID = NONE || $R.PRODUCT_ID = null || (type::is_string($R.PRODUCT_ID) && string::len(string::trim($R.PRODUCT_ID)) = 0) {
		NONE
	} else {
		fn::ridParam("product", $R.PRODUCT_ID)
	};

	let $instances = if type::is_array($R.instances) {
		$R.instances
	} else {
		let $local = select value instance from only type::record("instance", "local");
		if type::is_string($local) && string::len(string::trim($local)) > 0 {
			[$local]
		} else {
			[]
		}
	};

	let $source = if type::is_string($R.SOURCE) && string::len(string::trim($R.SOURCE)) > 0 {
		string::lowercase(string::trim($R.SOURCE))
	} else {
		"purchase"
	};

	let $metadata = if type::is_object($R.METADATA) { $R.METADATA } else { {} };

	let $subscriptionID = fn::userSubscriptionID($UID, $EXAM_ID);
	fn::ensureUserAccess($UID);
	let $accessId = type::record("uAccess", record::id($UID));

	let $basePayload = {
		u: $UID,
		exam: $EXAM_ID,
		state: "active",
		source: $source,
		start_datetime: <datetime> $R.START_DATE,
		expiry_datetime: <datetime> $R.END_DATE,
		last_updated: time::now(),
		metadata: $metadata
	};

	let $basePayload = if type::is_record($PRODUCT_ID) && record::exists($PRODUCT_ID) {
		fn::objectAssign($basePayload, {
			productSubscriptions: [$PRODUCT_ID]
		})
	} else {
		$basePayload
	};

	let $writePayload = fn::objectAssign($basePayload, {
		subscriptions: [$accessId],
		userSubscriptions: [$UID],
		examSubscriptions: [$EXAM_ID]
	});

	let $subscription = if record::exists($subscriptionID) {
		fn::updateUserSubscription($subscriptionID, $writePayload)
	} else {
		let $createPayload = fn::objectAssign($writePayload, {
			create_datetime: time::now(),
			instances: $instances
		});
		fn::createUserSubscription($createPayload)
	};
	let $subscription = if type::is_array($subscription) {
		array::first($subscription)
	} else {
		$subscription
	};

	let $subscriptionId = if type::is_object($subscription) && type::is_record($subscription.id) {
		$subscription.id
	} else if type::is_record($subscription) {
		$subscription
	} else {
		$subscriptionID
	};

	if !type::is_record($subscriptionId) {
		throw "createExamAccess | failed to create subscription";
	};

	update only $accessId merge {
		"access": "subscription",
		last_updated: time::now()
	};

	return if type::is_object($subscription) {
		$subscription
	} else {
		select * from only $subscriptionId
	};
};
