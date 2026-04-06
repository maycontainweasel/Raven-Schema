DEFINE FUNCTION OVERWRITE fn::createTrial($request: object) {
	if !$request {
		throw "createTrial | expects request payload";
	};

	let $uidInput = if $request.u != NONE { $request.u } else { $request.UID };
	let $UID = fn::ridParam("u", $uidInput);
	if !type::is_record($UID) || !record::exists($UID) {
		throw "createTrial | expects a valid u (uid)";
	};

	let $examInput = if $request.exam != NONE { $request.exam } else { $request.EXAM_ID };
	let $EXAM_ID = fn::ridParam("exam", $examInput);
	if !type::is_record($EXAM_ID) || !record::exists($EXAM_ID) {
		throw "createTrial | expects a valid exam";
	};

	let $startDateInput = if $request.startDate != NONE { $request.startDate } else if $request.START_DATE != NONE { $request.START_DATE } else if $request.DATE != NONE { $request.DATE } else { time::now() };
	let $startDate = <datetime> $startDateInput;
	if !type::is_datetime($startDate) {
		throw "createTrial | expects a valid start date";
	};

	let $sessionInput = if $request.s != NONE { $request.s } else if $request.sid != NONE { $request.sid } else if $request.sessionID != NONE { $request.sessionID } else { NONE };
	let $sessionId = if $sessionInput = NONE || $sessionInput = null || (type::is_string($sessionInput) && string::len(string::trim($sessionInput)) = 0) {
		NONE
	} else {
		fn::ridParam("s", $sessionInput)
	};

	let $trialId = type::record("uTrial", record::id($UID));
	let $trialPayload = {
		u: $UID,
		exam: $EXAM_ID,
		sessionComplete: if type::is_bool($request.sessionComplete) { $request.sessionComplete } else { false },
		sessionCompleteDate: if $request.sessionCompleteDate != NONE && $request.sessionCompleteDate != null && string::len(string::trim(<string> $request.sessionCompleteDate)) > 0 { <datetime> $request.sessionCompleteDate } else { "" },
		sessionStarted: if type::is_bool($request.sessionStarted) { $request.sessionStarted } else { false },
		sessionStartDate: if $request.sessionStartDate != NONE && $request.sessionStartDate != null && string::len(string::trim(<string> $request.sessionStartDate)) > 0 { <datetime> $request.sessionStartDate } else { "" },
		startDate: $startDate,
		last_updated: time::now()
	};
	let $trialPayload = if type::is_record($sessionId) {
		fn::objectAssign($trialPayload, { s: $sessionId })
	} else {
		$trialPayload
	};

	upsert only $trialId merge $trialPayload;

	let $userTrialRelation = select * from UserTrial where in = $UID and out = $trialId limit 1;
	if !array::len($userTrialRelation) {
		relate only $UID->UserTrial->$trialId;
	};

	fn::ensureUserAccess($UID);
	let $accessId = type::record("uAccess", record::id($UID));
	let $accessTrialRelation = select * from AccessTrial where in = $accessId and out = $trialId limit 1;
	if !array::len($accessTrialRelation) {
		relate only $accessId->AccessTrial->$trialId;
	};

	fn::reconcileUserAccess($UID);

	return select * from only $trialId;
};
