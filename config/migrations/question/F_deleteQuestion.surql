DEFINE FUNCTION OVERWRITE fn::deleteQuestion($QuestionID: any) {

	let $rid = fn::ridParam("q", $QuestionID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	delete from ExamQuestions where out = $rid;
	delete from QuestionQcats where in = $rid;
	delete from QuestionQtags where in = $rid;
	delete from QuestionQtopics where in = $rid;

	return if $result {
		return $result['id'];
	} else {
		throw "deleteQuestion | failed to delete Question";
	}

};
