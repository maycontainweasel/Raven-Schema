DEFINE FUNCTION OVERWRITE fn::reduceExamAccess($R: object) {
	if !$R {
		throw "reduceExamAccess | expects a valid request object";
	};

	let $UID = fn::ridParam("u", $R.UID);
	if !type::is_record($UID) || !record::exists($UID) {
		throw "reduceExamAccess | expects a valid request UID";
	};

	let $EXAM_ID = fn::ridParam("exam", $R.EXAM_ID);
	if !type::is_record($EXAM_ID) || !record::exists($EXAM_ID) {
		throw "reduceExamAccess | expects a valid request EXAM_ID";
	};

	let $days = if $R.DAYS != NONE && $R.DAYS != null {
		<int> $R.DAYS
	} else if $R.DURATION_DAYS != NONE && $R.DURATION_DAYS != null {
		<int> $R.DURATION_DAYS
	} else {
		0
	};
	if $days <= 0 {
		throw "reduceExamAccess | expects DAYS or DURATION_DAYS to be a positive number";
	};

	let $subscriptionID = fn::userSubscriptionID($UID, $EXAM_ID);
	if !type::is_record($subscriptionID) || !record::exists($subscriptionID) {
		throw "reduceExamAccess | expects an existing subscription";
	};

	let $subscription = select * from only $subscriptionID;
	let $state = if type::is_string($subscription.state) {
		string::lowercase(string::trim($subscription.state))
	} else {
		"active"
	};
	if $state = "revoked" {
		throw "reduceExamAccess | cannot reduce a revoked subscription";
	};
	if !type::is_datetime($subscription.expiry_datetime) {
		throw "reduceExamAccess | subscription is missing expiry_datetime";
	};

	let $startDate = if type::is_datetime($subscription.start_datetime) {
		$subscription.start_datetime
	} else {
		time::now()
	};
	let $candidateEnd = $subscription.expiry_datetime - <duration> string::concat($days, "d");
	let $nextEnd = if $candidateEnd < $startDate {
		$startDate
	} else {
		$candidateEnd
	};

	return fn::updateExamAccess({
		UID: $UID,
		EXAM_ID: $EXAM_ID,
		END_DATE: $nextEnd,
		SOURCE: if type::is_string($R.SOURCE) && string::len(string::trim($R.SOURCE)) > 0 { $R.SOURCE } else { "reduction" },
		METADATA: if type::is_object($R.METADATA) { $R.METADATA } else { {} }
	});
};
