DEFINE FUNCTION OVERWRITE fn::initQRecord($QID: record) {
	let $QID = fn::ridParam("q", $QID);
	if !type::is_record($QID) || !record::exists($QID) {
		throw "initQRecord | expects a valid question record";
	};

	let $QPR_ID = type::thing("qpr", $QID);
	let $QPR = select * from only $QPR_ID;
	if !$QPR {
		let $QPR = upsert only $QPR_ID merge {
			attempts: 0,
			noCorrect: 0,
			noIncorrect: 0,
			percCorrect: 0,
			totalTime: 0,
			averageTime: 0
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
				id: type::thing("qor", [$QID, $this.id]),
				attempts: <int> ((select value attempts from only type::thing("qor", [$QID, $this.id])) || 0)
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
	from only $QPR_ID;
};
