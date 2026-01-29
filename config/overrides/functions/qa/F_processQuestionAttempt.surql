DEFINE FUNCTION fn::processQuestionAttempt($payload: object) {
	
  /*
  let $payload = {
    "SID": s:5sxcbdfamf4jcm1bu27m,
    "QID": type::record("q", 20105088),
    "QOPT_ID": QuestionOptions:[q:20105088, qo:[q:20105088, '1fc19ddb7aaa71d420317e364cee2504']],
    "ANSWER_TS": time::now(),
    "ORDER": 1
  };

  fn::processQuestionAttempt($payload);
  */

	let $SID = if !record::exists($payload.SID) {
		throw 'PQA | expects valid SID';
	} else {
		$payload.SID;
	};
	let $QID = if !record::exists($payload.QID) {
		throw 'PQA | expects valid $QID';
	} else {
		$payload.QID;
	};
	
	LET $QOPT_ID = if !record::exists($payload.QOPT_ID) {
		throw 'PQA | expects valid QOPT_ID';
	} else {
		$payload.QOPT_ID;
	};

	LET $ANSWER_TS = if (!$payload.ANSWER_TS) {
		time::now();
	} else {
		$payload.ANSWER_TS;
	};

	// This "Order" refers to the index of the question in the session, question 1, or 2, ofor example, not usre if its 0 indexed.
	LET $ORDER = if (!type::is_number($payload.ORDER) || $payload.ORDER < 0) {
		time::now();
	} else {
		$payload.ORDER;
	};

	LET $_RECONCILIATION_KEY = if (!$payload._reconciliationKey) {
		'';
	} else {
		$payload._reconciliationKey;
	};

// return select * from $SID;

	LET $UID = select value u from only $SID;
	// This question belongs to which exams
	LET $QUESTION_EXAM_IDs = select VALUE <-ExamQuestions.in from ONLY $QID;
	
// It would be great if we passed these ids to this function so we dont need to run this query
	let $EXAM_TERMS = select value ({
		"exam": $this.id,
		"terms": select value id from qt where
			<-(QuestionTerms where in = $QID) and
			<-QuestionTerms<-q<-(ExamQuestions where in == $parent.id)
	}) from $QUESTION_EXAM_IDs;

	//spr:5sxcbdfamf4jcm1bu27m
	LET $SPR_ID =  type::record("spr", $SID);

	LET $SESSION_CATEGORIES = array::first(select value categories from $SID);
	LET $SESSION_TERMS = array::first(select value terms from $SID);
	LET $SESSION_CATEGORY_PAYLOAD = if ($SESSION_CATEGORIES != none) {
		$SESSION_CATEGORIES;
	} else {
		$SESSION_TERMS;
	};


	LET $Q_OPTIONS = array::first(select VALUE ->QuestionOptions.out from $QID);
	LET $Q_CORRECT_OPTION_ID = array::first(select VALUE ->QCorrectOption.out from ONLY $QID);
	LET $CORRECT = ($QOPT_ID == $Q_CORRECT_OPTION_ID);

	let $SQ_ID = type::record('SessionQuestions', [$SID, $QID]);
	let $SQ_TOTAL_TIME = select value totalTime from only $SQ_ID;
	// Thought to include the question index in the id so we could technically track the question order

	let $QT_IDs = <array<record>> fn::getUniqueCategoryTermIDsFromQuestionID($QID);

	let $QA_ID = select value id from only (
			UPSERT only type::record('qa', [$SID, $QID, $ORDER]) 
				merge {
					"create_at": time::now(),
					"s": <record> $SID,
					"q": <record> $QID,
					"u": <record> $UID,
					"exams": <array<record>> $QUESTION_EXAM_IDs, // this is the record of just examID for this question, used to create the examsTerms key
					"examsTerms": $EXAM_TERMS, // this is the response of which terms are connected to this exam and this question id, used for redis cache
					"categories": $SESSION_CATEGORY_PAYLOAD, // Session create payload (categories/terms)
					"categoryIds": $QT_IDs, // Actual category ids on the question
					"terms": $SESSION_TERMS, // legacy field (keep for compatibility)
					"startTS": '', // This can be stermined from sessionEvents now
					"answerTS": $ANSWER_TS,
					"selectedOptionID": <record> $QOPT_ID,
					"correct": $CORRECT,
					"order": $ORDER,
					"totalTime": $SQ_TOTAL_TIME,
					"_reconciliationKey": $_RECONCILIATION_KEY
				} 
		);


	// ExamAttempts
	for $ExamID in $QUESTION_EXAM_IDs {
		RELATE $ExamID->ExamAttempts->$QA_ID;
	};

	// QuestionAttempts
	RELATE $QID->QuestionAttempts->$QA_ID;

	// UserAttempts
	RELATE $UID->UserAttempts->$QA_ID;

	// SessionAttempts
	RELATE $SID->SessionAttempts->$QA_ID;

	let $TERMS = <array<record>> array::distinct(
		array::flatten(
			select value terms from $SESSION_CATEGORY_PAYLOAD where terms != none
		)
	);


	// We do this to ensure that we process the records for every term on every exam linked to this session. 
	// Term ids tagged to this question.
	// Relate the term records to the question attempt
	// Add an attempt to the Global record of attempt for the category in the global scope
	FOR $QT_ID IN $QT_IDs {
		RELATE $QT_ID->TermAttempts->$QA_ID; 
	};

	// Process the User Exam Term Records
	// Instead of using a for loop i'm using a select statement, 
	// its critical that you ensure everything is seen as a record when processing anything
	// this approach let me check everything and make sure its all correct
	select value
		{
			let $EXAM_ID = <record> $this.id;            
			return if (type::is_array($QT_IDs) && array::len($QT_IDs) > 0) {

				return select value { 
					fn::processUserExamTermPerformanceRecord($UID, <record> $EXAM_ID, <record> $this.id);
				} from <array<record>> $QT_IDs;

			} else {
				return false;
			};
		} 
	from $TAXTERMS;





	// Update the SessionQuestion with the complete state and the startTS & answerTS
	// Update the SessionQuestions relationship with the complete status, and answerTS

	let $SQ_REL_ID = array::first(select value id from SessionQuestions where (in = $SID and out = $QID));

	update $SQ_REL_ID merge {
		"complete": true,
		"startTS": $START_TS,
		"answerTS": $ANSWER_TS
	};

	let $QA = array::first(select * from $QA_ID);

	RETURN $QA;
	
};
