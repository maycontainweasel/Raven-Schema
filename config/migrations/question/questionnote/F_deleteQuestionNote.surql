DEFINE FUNCTION OVERWRITE fn::deleteQuestionNote($QuestionNoteID: any) {

	let $rid = fn::ridParam("qnote", $QuestionNoteID);
	let $rid = if type::is_record($rid) && record::tb($rid) == "q" { type::record("qnote", record::id($rid)) } else { $rid };

	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteQuestionNote | failed to delete QuestionNote";
	}

};
