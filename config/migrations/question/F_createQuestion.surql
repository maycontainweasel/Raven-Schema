DEFINE FUNCTION OVERWRITE fn::createQuestion($payload: object) {

	if !$payload {
		throw "createQuestion | payload is required";
	};

	let $subtable_options = $payload.options;
	let $subtable_questionPerformanceRecord = $payload.questionPerformanceRecord;
	let $subtable_userQuestionPerformanceRecord = $payload.userQuestionPerformanceRecord;
	let $subtable_questionNote = $payload.questionNote;
	let $subtable_userQuestionNote = $payload.userQuestionNote;

	let $payload = fn::objectRemove($payload, ["options", "questionPerformanceRecord", "userQuestionPerformanceRecord", "questionNote", "userQuestionNote"]);

	if $payload.qid = NONE || $payload.qid = null || (type::is_string($payload.qid) && string::len($payload.qid) = 0) {
		throw "createQuestion | requires qid";
	};
	if $payload.question = NONE || $payload.question = null || (type::is_string($payload.question) && string::len($payload.question) = 0) {
		throw "createQuestion | requires question";
	};

	if !$payload.exams {
		throw "createQuestion | requires exams";
	};
	if type::is_array($payload.exams) && array::len($payload.exams) == 0 {
		throw "createQuestion | requires exams";
	};


	let $defaultData = {
		qid: 0,
		qCode: "",
		question: "",
		explanation: "",
		explanationRef: "",
		source: "",
		instances: [],
		tags: [],
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $payload = fn::objectAssign($payload, {
		tags: if type::is_array($payload.tags) { $payload.tags } else if $payload.tags = NONE || $payload.tags = null || (type::is_string($payload.tags) && string::len(string::trim($payload.tags)) = 0) { $payload.tags } else { fn::ridParam("t_q_qtag", $payload.tags) },
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
		tags: $tax_tags_norm
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


	if !type::is_array($payload.instances){
		throw "createQuestion | requires valid instances array";
	};

	let $rid = type::record('q', $payload.qid);
	let $payload = fn::objectRemove($payload, ["id"]);
	let $record = upsert $rid content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	let $record = if $record { $record } else {
		let $fallback = select * from only $rid;
		if type::is_array($fallback) { array::first($fallback) } else { $fallback };
	};

	let $recordID = if type::is_object($record) && type::is_record($record.id) {
		$record.id
	} else if type::is_record($record) {
		$record
	} else {
		null
	};

	if !$recordID {
		throw "createQuestion | failed to create q";
	};

	if type::is_array($rel_exams_norm) {
		for $rel in $rel_exams_norm {
			fn::createEdge($rel, "ExamQuestions", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_exams {
		for $rel in $rel_exams_norm {
			fn::createEdge($rel, "ExamQuestions", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	};


	if type::is_array($tax_categories_norm) {
		for $rel in $tax_categories_norm {
			fn::attachTerm("q", "qcat", $recordID, $rel, { skipExists: true });
		};
	} else if $tax_categories {
		for $rel in $tax_categories_norm {
			fn::attachTerm("q", "qcat", $recordID, $rel, { skipExists: true });
		};
	};

	if type::is_array($tax_tags_norm) {
		for $rel in $tax_tags_norm {
			fn::attachTerm("q", "qtag", $recordID, $rel, { skipExists: true });
		};
	} else if $tax_tags {
		for $rel in $tax_tags_norm {
			fn::attachTerm("q", "qtag", $recordID, $rel, { skipExists: true });
		};
	};

	if type::is_array($tax_topics_norm) {
		for $rel in $tax_topics_norm {
			fn::attachTerm("q", "qtopic", $recordID, $rel, { skipExists: true });
		};
	} else if $tax_topics {
		for $rel in $tax_topics_norm {
			fn::attachTerm("q", "qtopic", $recordID, $rel, { skipExists: true });
		};
	};


	if type::is_array($subtable_options) {
		let $subtable_index_options_qOption = 0;
		for $subtable_item_options_qOption in $subtable_options {
			let $subtable_payload_options_qOption = if type::is_object($subtable_item_options_qOption) { $subtable_item_options_qOption } else if $subtable_item_options_qOption = NONE || $subtable_item_options_qOption = null { {} } else { { label: $subtable_item_options_qOption } };
			let $subtable_payload_options_qOption = if $subtable_payload_options_qOption.order = NONE {
				fn::objectAssign($subtable_payload_options_qOption, { order: $subtable_index_options_qOption })
			} else {
				$subtable_payload_options_qOption
			};
			fn::createQuestionOption($recordID, fn::objectAssign($subtable_payload_options_qOption, { skipExists: true }));
			let $subtable_index_options_qOption = $subtable_index_options_qOption + 1;
		};
	} else if type::is_object($subtable_options) || $subtable_options {
		let $subtable_payload_options_qOption = if type::is_object($subtable_options) { $subtable_options } else if $subtable_options = NONE || $subtable_options = null { {} } else { { label: $subtable_options } };
		let $subtable_payload_options_qOption = if $subtable_payload_options_qOption.order = NONE {
			fn::objectAssign($subtable_payload_options_qOption, { order: 0 })
		} else {
			$subtable_payload_options_qOption
		};
		fn::createQuestionOption($recordID, fn::objectAssign($subtable_payload_options_qOption, { skipExists: true }));
	};

	if type::is_array($subtable_questionPerformanceRecord) {
		if array::len($subtable_questionPerformanceRecord) > 0 {
			let $subtable_item_questionPerformanceRecord_qpr = array::first($subtable_questionPerformanceRecord);
			let $subtable_payload_questionPerformanceRecord_qpr = if type::is_object($subtable_item_questionPerformanceRecord_qpr) { $subtable_item_questionPerformanceRecord_qpr } else if $subtable_item_questionPerformanceRecord_qpr = NONE || $subtable_item_questionPerformanceRecord_qpr = null { {} } else { { attempts: $subtable_item_questionPerformanceRecord_qpr } };
			fn::createQuestionPerformanceRecord($recordID, fn::objectAssign($subtable_payload_questionPerformanceRecord_qpr, { skipExists: true }));
		} else if true {
			fn::createQuestionPerformanceRecord($recordID, { skipExists: true });
		};
	} else if type::is_object($subtable_questionPerformanceRecord) || $subtable_questionPerformanceRecord {
		let $subtable_payload_questionPerformanceRecord_qpr = if type::is_object($subtable_questionPerformanceRecord) { $subtable_questionPerformanceRecord } else if $subtable_questionPerformanceRecord = NONE || $subtable_questionPerformanceRecord = null { {} } else { { attempts: $subtable_questionPerformanceRecord } };
		fn::createQuestionPerformanceRecord($recordID, fn::objectAssign($subtable_payload_questionPerformanceRecord_qpr, { skipExists: true }));
	} else if true {
		fn::createQuestionPerformanceRecord($recordID, { skipExists: true });
	};

	if type::is_array($subtable_userQuestionPerformanceRecord) {
		let $subtable_index_userQuestionPerformanceRecord_uqpr = 0;
		for $subtable_item_userQuestionPerformanceRecord_uqpr in $subtable_userQuestionPerformanceRecord {
			let $subtable_payload_userQuestionPerformanceRecord_uqpr = if type::is_object($subtable_item_userQuestionPerformanceRecord_uqpr) { $subtable_item_userQuestionPerformanceRecord_uqpr } else if $subtable_item_userQuestionPerformanceRecord_uqpr = NONE || $subtable_item_userQuestionPerformanceRecord_uqpr = null { {} } else { { attempts: $subtable_item_userQuestionPerformanceRecord_uqpr } };
			let $subtable_payload_userQuestionPerformanceRecord_uqpr = if $subtable_payload_userQuestionPerformanceRecord_uqpr.order = NONE {
				fn::objectAssign($subtable_payload_userQuestionPerformanceRecord_uqpr, { order: $subtable_index_userQuestionPerformanceRecord_uqpr })
			} else {
				$subtable_payload_userQuestionPerformanceRecord_uqpr
			};
			fn::createUserQuestionPerformanceRecord($recordID, fn::objectAssign($subtable_payload_userQuestionPerformanceRecord_uqpr, { skipExists: true }));
			let $subtable_index_userQuestionPerformanceRecord_uqpr = $subtable_index_userQuestionPerformanceRecord_uqpr + 1;
		};
	} else if type::is_object($subtable_userQuestionPerformanceRecord) || $subtable_userQuestionPerformanceRecord {
		let $subtable_payload_userQuestionPerformanceRecord_uqpr = if type::is_object($subtable_userQuestionPerformanceRecord) { $subtable_userQuestionPerformanceRecord } else if $subtable_userQuestionPerformanceRecord = NONE || $subtable_userQuestionPerformanceRecord = null { {} } else { { attempts: $subtable_userQuestionPerformanceRecord } };
		let $subtable_payload_userQuestionPerformanceRecord_uqpr = if $subtable_payload_userQuestionPerformanceRecord_uqpr.order = NONE {
			fn::objectAssign($subtable_payload_userQuestionPerformanceRecord_uqpr, { order: 0 })
		} else {
			$subtable_payload_userQuestionPerformanceRecord_uqpr
		};
		fn::createUserQuestionPerformanceRecord($recordID, fn::objectAssign($subtable_payload_userQuestionPerformanceRecord_uqpr, { skipExists: true }));
	};

	if type::is_array($subtable_questionNote) {
		let $subtable_index_questionNote_qnote = 0;
		for $subtable_item_questionNote_qnote in $subtable_questionNote {
			let $subtable_payload_questionNote_qnote = if type::is_object($subtable_item_questionNote_qnote) { $subtable_item_questionNote_qnote } else if $subtable_item_questionNote_qnote = NONE || $subtable_item_questionNote_qnote = null { {} } else { { createdAt: $subtable_item_questionNote_qnote } };
			let $subtable_payload_questionNote_qnote = if $subtable_payload_questionNote_qnote.order = NONE {
				fn::objectAssign($subtable_payload_questionNote_qnote, { order: $subtable_index_questionNote_qnote })
			} else {
				$subtable_payload_questionNote_qnote
			};
			fn::createQuestionNote($recordID, fn::objectAssign($subtable_payload_questionNote_qnote, { skipExists: true }));
			let $subtable_index_questionNote_qnote = $subtable_index_questionNote_qnote + 1;
		};
	} else if type::is_object($subtable_questionNote) || $subtable_questionNote {
		let $subtable_payload_questionNote_qnote = if type::is_object($subtable_questionNote) { $subtable_questionNote } else if $subtable_questionNote = NONE || $subtable_questionNote = null { {} } else { { createdAt: $subtable_questionNote } };
		let $subtable_payload_questionNote_qnote = if $subtable_payload_questionNote_qnote.order = NONE {
			fn::objectAssign($subtable_payload_questionNote_qnote, { order: 0 })
		} else {
			$subtable_payload_questionNote_qnote
		};
		fn::createQuestionNote($recordID, fn::objectAssign($subtable_payload_questionNote_qnote, { skipExists: true }));
	};

	if type::is_array($subtable_userQuestionNote) {
		let $subtable_index_userQuestionNote_uqnote = 0;
		for $subtable_item_userQuestionNote_uqnote in $subtable_userQuestionNote {
			let $subtable_payload_userQuestionNote_uqnote = if type::is_object($subtable_item_userQuestionNote_uqnote) { $subtable_item_userQuestionNote_uqnote } else if $subtable_item_userQuestionNote_uqnote = NONE || $subtable_item_userQuestionNote_uqnote = null { {} } else { { note: $subtable_item_userQuestionNote_uqnote } };
			let $subtable_payload_userQuestionNote_uqnote = if $subtable_payload_userQuestionNote_uqnote.order = NONE {
				fn::objectAssign($subtable_payload_userQuestionNote_uqnote, { order: $subtable_index_userQuestionNote_uqnote })
			} else {
				$subtable_payload_userQuestionNote_uqnote
			};
			fn::createUserQuestionNote($recordID, fn::objectAssign($subtable_payload_userQuestionNote_uqnote, { skipExists: true }));
			let $subtable_index_userQuestionNote_uqnote = $subtable_index_userQuestionNote_uqnote + 1;
		};
	} else if type::is_object($subtable_userQuestionNote) || $subtable_userQuestionNote {
		let $subtable_payload_userQuestionNote_uqnote = if type::is_object($subtable_userQuestionNote) { $subtable_userQuestionNote } else if $subtable_userQuestionNote = NONE || $subtable_userQuestionNote = null { {} } else { { note: $subtable_userQuestionNote } };
		let $subtable_payload_userQuestionNote_uqnote = if $subtable_payload_userQuestionNote_uqnote.order = NONE {
			fn::objectAssign($subtable_payload_userQuestionNote_uqnote, { order: 0 })
		} else {
			$subtable_payload_userQuestionNote_uqnote
		};
		fn::createUserQuestionNote($recordID, fn::objectAssign($subtable_payload_userQuestionNote_uqnote, { skipExists: true }));
	};


	return if $record {
		return $record;
	} else {
		throw "createQuestion | failed to create q";
	}

};

