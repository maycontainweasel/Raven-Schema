DEFINE FUNCTION OVERWRITE fn::deleteQuestionPerformanceRecord($QuestionPerformanceRecordID: any) {

	let $rid = fn::ridParam("qpr", $QuestionPerformanceRecordID);
	let $rid = if type::is_record($rid) && record::tb($rid) == "q" { type::record("qpr", record::id($rid)) } else { $rid };

	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteQuestionPerformanceRecord | failed to delete QuestionPerformanceRecord";
	}

};
