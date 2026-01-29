DEFINE FUNCTION OVERWRITE fn::deleteUserQuestionOptionRecord($UserQuestionOptionRecordID: any) {

	let $rid = fn::ridParam("uqor", $UserQuestionOptionRecordID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteUserQuestionOptionRecord | failed to delete UserQuestionOptionRecord";
	}

};
