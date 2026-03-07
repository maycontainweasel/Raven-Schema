DEFINE FUNCTION OVERWRITE fn::deleteExam($ExamID: any) {

	let $rid = fn::ridParam("exam", $ExamID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	delete from ProductExams where out = $rid;

	return if $result {
		return $result['id'];
	} else {
		throw "deleteExam | failed to delete Exam";
	}

};
