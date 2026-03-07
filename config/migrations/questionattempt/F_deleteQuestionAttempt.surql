DEFINE FUNCTION OVERWRITE fn::deleteQuestionAttempt($QuestionAttemptID: any) {

	let $rid = fn::ridParam("qa", $QuestionAttemptID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	delete from UserAttempts where out = $rid;
	delete from QuestionAttempts where out = $rid;
	delete from SessionAttempts where out = $rid;
	delete from ExamAttempts where out = $rid;
	delete from TermAttempts where out = $rid;

	return if $result {
		return $result['id'];
	} else {
		throw "deleteQuestionAttempt | failed to delete QuestionAttempt";
	}

};
