DEFINE FUNCTION OVERWRITE fn::updateQuestion($QuestionID: any, $payload: object) {

	let $rid = fn::ridParam("q", $QuestionID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateQuestion | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $payload = fn::objectAssign($payload, {
		tags: if $payload.tags = NONE { $current.tags } else if type::is_array($payload.tags) { $payload.tags } else if $payload.tags = null || (type::is_string($payload.tags) && string::len(string::trim($payload.tags)) = 0) { $payload.tags } else { fn::ridParam("t_q_qtag", $payload.tags) },
	});

	let $rel_exams = $payload.exams;

	let $tax_categories = $payload.categories;
	let $tax_tags = $payload.tags;
	let $tax_topics = $payload.topics;

	let $payload = fn::objectRemove($payload, ["exams"]);

	let $payload = fn::objectRemove($payload, ["categories", "topics"]);

	let $rel_exams_norm = fn::toRecordArray('exam', $rel_exams);

	let $tax_categories_list = if type::is_array($tax_categories) {
		$tax_categories
	} else if $tax_categories {
		[$tax_categories]
	} else {
		[]
	};
	let $tax_categories_norm = array::map($tax_categories_list, |$term| {
		if type::is_record($term) {
			type::record("t_q_qcat", record::id($term))
		} else {
			let $termPayload = { key: $term };
			type::record('t_q_qcat', $termPayload.key)
		};
	});

	let $tax_tags_list = if type::is_array($tax_tags) {
		$tax_tags
	} else if $tax_tags {
		[$tax_tags]
	} else {
		[]
	};
	let $tax_tags_norm = array::map($tax_tags_list, |$term| {
		if type::is_record($term) {
			type::record("t_q_qtag", record::id($term))
		} else {
			let $termPayload = { key: $term };
			type::record('t_q_qtag', $termPayload.key)
		};
	});
	let $payload = fn::objectAssign($payload, {
		tags: if type::is_array($tax_tags) || $tax_tags { $tax_tags_norm } else { $payload.tags }
	});

	let $tax_topics_list = if type::is_array($tax_topics) {
		$tax_topics
	} else if $tax_topics {
		[$tax_topics]
	} else {
		[]
	};
	let $tax_topics_norm = array::map($tax_topics_list, |$term| {
		if type::is_record($term) {
			type::record("t_q_qtopic", record::id($term))
		} else {
			let $termPayload = { key: $term };
			type::record('t_q_qtopic', $termPayload.key)
		};
	});


	let $result = update $rid merge $payload;
	let $result = if type::is_array($result) { array::first($result) } else { $result };

	// --- Refresh Record views
	update $rid merge {
		"touch": 1
	};
	update $rid unset touch;

	let $PID = fn::PID($rid);

	if(type::is_record($PID) && record::exists($PID)) {
		update $PID merge {
			"touch": 1
		};
		update $PID unset touch;
	};
	// --- End Refresh Record views

	if type::is_array($rel_exams) {
	delete from ExamQuestions where out = $rid;
		for $rel in $rel_exams_norm {
			fn::createEdge($rel, "ExamQuestions", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_exams {
	delete from ExamQuestions where out = $rid;
		for $rel in $rel_exams_norm {
			fn::createEdge($rel, "ExamQuestions", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	};


	if type::is_array($tax_categories) {
		delete from QuestionQcats where in = $rid;
		for $rel in $tax_categories_norm {
			fn::attachTerm("q", "qcat", $rid, $rel, {});
		};
	} else if $tax_categories {
		delete from QuestionQcats where in = $rid;
		for $rel in $tax_categories_norm {
			fn::attachTerm("q", "qcat", $rid, $rel, {});
		};
	};

	if type::is_array($tax_tags) {
		delete from QuestionQtags where in = $rid;
		for $rel in $tax_tags_norm {
			fn::attachTerm("q", "qtag", $rid, $rel, {});
		};
	} else if $tax_tags {
		delete from QuestionQtags where in = $rid;
		for $rel in $tax_tags_norm {
			fn::attachTerm("q", "qtag", $rid, $rel, {});
		};
	};

	if type::is_array($tax_topics) {
		delete from QuestionQtopics where in = $rid;
		for $rel in $tax_topics_norm {
			fn::attachTerm("q", "qtopic", $rid, $rel, {});
		};
	} else if $tax_topics {
		delete from QuestionQtopics where in = $rid;
		for $rel in $tax_topics_norm {
			fn::attachTerm("q", "qtopic", $rid, $rel, {});
		};
	};


	return if $result {
		return $result;
	} else {
		throw "updateQuestion | failed to update Question";
	}

};
