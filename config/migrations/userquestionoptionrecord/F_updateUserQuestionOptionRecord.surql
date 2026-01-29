DEFINE FUNCTION OVERWRITE fn::updateUserQuestionOptionRecord($UserQuestionOptionRecordID: any, $payload: object) {

	let $rid = fn::ridParam("uqor", $UserQuestionOptionRecordID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateUserQuestionOptionRecord | payload is required";
	};

	let $result = update $rid merge $payload;
	let $result = if type::is_array($result) { array::first($result) } else { $result };

	// --- Refresh Record views
	update $rid merge {
		"touch": 1
	};
	update $rid unset touch;

	let $PID = fn::PID($rid);

	if(type::is_record($PID) && record::exists($PID)) {
		update $PID merge {
			"touch": 1
		};
		update $PID unset touch;
	};
	// --- End Refresh Record views

	return if $result {
		return $result;
	} else {
		throw "updateUserQuestionOptionRecord | failed to update UserQuestionOptionRecord";
	}

};
