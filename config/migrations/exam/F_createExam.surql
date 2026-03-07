DEFINE FUNCTION OVERWRITE fn::createExam($payload: object) {

	if !$payload {
		throw "createExam | payload is required";
	};

	if $payload.key = NONE || $payload.key = null || (type::is_string($payload.key) && string::len($payload.key) = 0) {
		throw "createExam | requires key";
	};
	if $payload.title = NONE || $payload.title = null || (type::is_string($payload.title) && string::len($payload.title) = 0) {
		throw "createExam | requires title";
	};
	if $payload.qidIndex = NONE || $payload.qidIndex = null || (type::is_string($payload.qidIndex) && string::len($payload.qidIndex) = 0) {
		throw "createExam | requires qidIndex";
	};

	let $defaultData = {
		key: "",
		title: "",
		titleShort: "",
		description: "",
		college: "",
		sheetId: "",
		qidIndex: 0,
		order: 0,
		instances: [],
		colours: {
			gradient: {
				first: "#F1CB40",
				second: "#FFDA52",
			},
			primary: "#F1CB40",
			secondary: "#FFDA52",
		},
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $rel_exams = $payload.exams;

	let $payload = fn::objectRemove($payload, ["exams"]);

	let $rel_exams_norm = fn::toRecordArray('product', $rel_exams);

	if !type::is_array($payload.instances){
		throw "createExam | requires valid instances array";
	};

	let $rid = type::record('exam', $payload.key);
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
		throw "createExam | failed to create exam";
	};

	if type::is_array($rel_exams_norm) {
		for $rel in $rel_exams_norm {
			fn::createEdge($rel, "ProductExams", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_exams {
		for $rel in $rel_exams_norm {
			fn::createEdge($rel, "ProductExams", $recordID, { boundId: true, overwrite: false, skipExists: true });
		};
	};


	return if $record {
		return $record;
	} else {
		throw "createExam | failed to create exam";
	}

};

