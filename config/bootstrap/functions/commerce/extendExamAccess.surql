DEFINE FUNCTION OVERWRITE fn::extendExamAccess($R: object) {
	if !$R {
		throw "extendExamAccess | expects a valid request object";
	};

	let $UID = fn::ridParam("u", $R.UID);
	if !type::is_record($UID) || !record::exists($UID) {
		throw "extendExamAccess | expects a valid request UID";
	};

	let $EXAM_ID = fn::ridParam("exam", $R.EXAM_ID);
	if !type::is_record($EXAM_ID) || !record::exists($EXAM_ID) {
		throw "extendExamAccess | expects a valid request EXAM_ID";
	};

	let $days = if $R.DAYS != NONE && $R.DAYS != null {
		<int> $R.DAYS
	} else if $R.DURATION_DAYS != NONE && $R.DURATION_DAYS != null {
		<int> $R.DURATION_DAYS
	} else {
		0
	};
	if $days <= 0 {
		throw "extendExamAccess | expects DAYS or DURATION_DAYS to be a positive number";
	};

	let $subscriptionID = fn::userSubscriptionID($UID, $EXAM_ID);
	if !type::is_record($subscriptionID) || !record::exists($subscriptionID) {
		throw "extendExamAccess | expects an existing subscription";
	};

	let $subscription = select * from only $subscriptionID;
	let $state = if type::is_string($subscription.state) {
		string::lowercase(string::trim($subscription.state))
	} else {
		"active"
	};
	if $state = "revoked" {
		throw "extendExamAccess | cannot extend a revoked subscription";
	};

	let $startsNow = !(type::is_datetime($subscription.expiry_datetime) && $subscription.expiry_datetime > time::now());
	let $nextStart = if $startsNow { time::now() } else { $subscription.start_datetime };
	let $baseDate = if $startsNow { time::now() } else { $subscription.expiry_datetime };
	let $nextEnd = $baseDate + <duration> string::concat($days, "d");

	return fn::updateExamAccess({
		UID: $UID,
		EXAM_ID: $EXAM_ID,
		START_DATE: $nextStart,
		END_DATE: $nextEnd,
		SOURCE: if type::is_string($R.SOURCE) && string::len(string::trim($R.SOURCE)) > 0 { $R.SOURCE } else { "extension" },
		METADATA: if type::is_object($R.METADATA) { $R.METADATA } else { {} }
	});
};
