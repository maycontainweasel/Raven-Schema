DEFINE FUNCTION OVERWRITE fn::deleteQuestionRecord($QuestionRecordID: any) {

	let $rid = fn::ridParam("qRecord", $QuestionRecordID);
	let $rid = if type::is_record($rid) && record::tb($rid) == "q" { type::record("qRecord", record::id($rid)) } else { $rid };

	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteQuestionRecord | failed to delete QuestionRecord";
	}

};
