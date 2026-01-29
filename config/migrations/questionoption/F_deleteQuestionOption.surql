DEFINE FUNCTION OVERWRITE fn::deleteQuestionOption($QuestionOptionID: any) {

	let $rid = fn::ridParam("qOption", $QuestionOptionID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteQuestionOption | failed to delete QuestionOption";
	}

};
