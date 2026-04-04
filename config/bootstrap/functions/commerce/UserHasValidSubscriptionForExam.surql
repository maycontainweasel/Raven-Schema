DEFINE FUNCTION OVERWRITE fn::UserHasValidSubscriptionForExam($UID: any, $EXAM_ID: any) {
	if !$UID {
		throw "UserHasValidSubscriptionForExam | expects valid $UID";
	};
	let $UID = fn::ridParam("u", $UID);
	if !type::is_record($UID) || !record::exists($UID) {
		throw "UserHasValidSubscriptionForExam | expects valid $UID";
	};

	if !$EXAM_ID {
		throw "UserHasValidSubscriptionForExam | expects valid $EXAM_ID";
	};
	let $EXAM_ID = fn::ridParam("exam", $EXAM_ID);
	if !type::is_record($EXAM_ID) || !record::exists($EXAM_ID) {
		throw "UserHasValidSubscriptionForExam | expects valid $EXAM_ID";
	};

	fn::reconcileUserAccess($UID);

	let $subID = fn::userSubscriptionID($UID, $EXAM_ID);
	let $sub = select * from only $subID;

	return if type::is_object($sub) && type::is_record($sub.id) && record::exists($sub.id) {
		let $state = if type::is_string($sub.state) {
			string::lowercase(string::trim($sub.state))
		} else {
			"active"
		};
		let $isActive = ($state = "active" || $state = "pending");
		let $hasExpiry = type::is_datetime($sub.expiry_datetime);
		return ($isActive && $hasExpiry && $sub.expiry_datetime > time::now());
	} else {
		return false;
	};
};
