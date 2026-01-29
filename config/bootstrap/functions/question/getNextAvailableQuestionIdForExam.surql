DEFINE FUNCTION overwrite fn::getNextAvailableQuestionIdForExam($Exam_ID: record) {
	if !type::is_record($Exam_ID) || !record::exists($Exam_ID) {
		throw "getNextAvailableQuestionIdForExam | expects valid exam record id";
	};

	let $qidIndex = select value qidIndex from only $Exam_ID;
	let $qidPrefix = string::slice(<string> $qidIndex, 0, 4);

	let $ids = <set>(select value qid from q where string::starts_with(<string> qid, $qidPrefix));
	
	if(type::is_array($ids) && array::len($ids) > 0) {
		return math::max($ids) + 1;
	} else {
    return $qidIndex + 1;
	};

};