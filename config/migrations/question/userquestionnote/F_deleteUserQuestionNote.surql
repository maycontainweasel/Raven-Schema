DEFINE FUNCTION OVERWRITE fn::deleteUserQuestionNote($UserQuestionNoteID: any) {

	let $rid = fn::ridParam("uqnote", $UserQuestionNoteID);
	let $rid = if type::is_record($rid) && record::tb($rid) == "q" { type::record("uqnote", record::id($rid)) } else { $rid };

	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteUserQuestionNote | failed to delete UserQuestionNote";
	}

};
