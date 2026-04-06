DEFINE FUNCTION OVERWRITE fn::initUserQRecord($UID: record, $QID: record) {
	let $UID = fn::ridParam("u", $UID);
	let $QID = fn::ridParam("q", $QID);

	if !type::is_record($UID) || !record::exists($UID) {
		throw "initUserQRecord | expects a valid user record";
	};
	if !type::is_record($QID) || !record::exists($QID) {
		throw "initUserQRecord | expects a valid question record";
	};

	let $UQPR_ID = type::thing("uqpr", [$UID, $QID]);
	let $UQPR = select * from only $UQPR_ID;
	if !$UQPR {
		let $UQPR = upsert only $UQPR_ID merge {
			attempts: 0,
			noCorrect: 0,
			noIncorrect: 0,
			percCorrect: 0,
			totalTime: 0,
			averageTime: 0,
			order: 0
		};
	};

	let $QUESTION = select * from only $QID;
	let $OPTIONS = (
		select value {
			id: type::thing("qo", [$QID, $this.optionKey]),
			q: $QID,
			qid: <int> ($QUESTION.qid || 0),
			correct: <bool> ($this.correct || false),
			record: {
				id: type::thing("uqor", [$UID, $this.id]),
				attempts: <int> ((select value attempts from only type::thing("uqor", [$UID, $this.id])) || 0)
			}
		}
		from qOption
		where <-(QuestionOption where in = $QID)
		order by order
	);

	return select
		*,
		$QID as q,
		$OPTIONS as options
	from only $UQPR_ID;
};
