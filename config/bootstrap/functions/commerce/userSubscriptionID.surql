DEFINE FUNCTION OVERWRITE fn::userSubscriptionID($UID: any, $EXAM_ID: any) {
	let $UID = fn::ridParam("u", $UID);
	if !type::is_record($UID) || !record::exists($UID) {
		throw "userSubscriptionID | expects valid $UID";
	};

	let $EXAM_ID = fn::ridParam("exam", $EXAM_ID);
	if !type::is_record($EXAM_ID) || !record::exists($EXAM_ID) {
		throw "userSubscriptionID | expects valid $EXAM_ID";
	};

	return type::record("uSubscription", fn::stringID([$UID, $EXAM_ID]));
};
