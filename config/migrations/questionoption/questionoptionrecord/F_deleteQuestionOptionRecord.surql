DEFINE FUNCTION OVERWRITE fn::deleteQuestionOptionRecord($QuestionOptionRecordID: any) {

	let $rid = fn::ridParam("qor", $QuestionOptionRecordID);
	let $rid = if type::is_record($rid) && record::tb($rid) == "qOption" { type::record("qor", record::id($rid)) } else { $rid };

	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteQuestionOptionRecord | failed to delete QuestionOptionRecord";
	}

};
