DEFINE FUNCTION OVERWRITE fn::deleteUserQuestionPerformanceRecord($UserQuestionPerformanceRecordID: any) {

	let $rid = fn::ridParam("uqpr", $UserQuestionPerformanceRecordID);
	let $rid = if type::is_record($rid) && record::tb($rid) == "q" { type::record("uqpr", record::id($rid)) } else { $rid };

	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteUserQuestionPerformanceRecord | failed to delete UserQuestionPerformanceRecord";
	}

};
