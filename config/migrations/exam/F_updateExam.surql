DEFINE FUNCTION OVERWRITE fn::updateExam($ExamID: any, $payload: object) {

	let $rid = fn::ridParam("exam", $ExamID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateExam | payload is required";
	};

	let $current = (select * from $rid)[0];

	let $rel_exams = $payload.exams;

	let $payload = fn::objectRemove($payload, ["exams"]);

	let $rel_exams_norm = fn::toRecordArray('product', $rel_exams);

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
	delete from ProductExams where out = $rid;
		for $rel in $rel_exams_norm {
			fn::createEdge($rel, "ProductExams", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	} else if $rel_exams {
	delete from ProductExams where out = $rid;
		for $rel in $rel_exams_norm {
			fn::createEdge($rel, "ProductExams", $rid, { boundId: true, overwrite: false, skipExists: true });
		};
	};


	return if $result {
		return $result;
	} else {
		throw "updateExam | failed to update Exam";
	}

};
