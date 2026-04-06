DEFINE FUNCTION OVERWRITE fn::initOrCreateSessionQuestion($SID: record, $QID: record) {
	if !type::is_record($SID) || !record::exists($SID) {
		throw "initOrCreateSessionQuestion | expects a valid session record";
	};
	if !type::is_record($QID) || !record::exists($QID) {
		throw "initOrCreateSessionQuestion | expects a valid question record";
	};

	let $SQ_ID = type::thing("SessionQuestions", [$SID, $QID]);
	let $QIDS = select value qids from only $SID;

	if !type::is_array($QIDS) {
		throw "initOrCreateSessionQuestion | session qids array is invalid";
	};

	let $SQ = select * from only $SQ_ID;
	if !$SQ {
		let $REL = (select * from SessionQuestions where in = $SID and out = $QID);
		if !type::is_array($REL) || array::len($REL) = 0 {
			relate only $SID->SessionQuestions->$QID set
				id = $SQ_ID,
				s = $SID,
				q = $QID,
				order = <int> array::find_index($QIDS, $QID),
				flagged = false,
				complete = false,
				totalTime = 0,
				lastUpdated = time::now();
		};
	};

	return fn::initSessionQuestionBySQ_ID($SQ_ID);
};
