DEFINE FUNCTION OVERWRITE fn::initSessionTime($SID: record) {
	if !type::is_record($SID) || !record::exists($SID) {
		throw "initSessionTime | expects a valid session record";
	};

	let $SPR_ID = type::thing("spr", $SID);
	let $TOTAL = select value totalSessionTime from only $SPR_ID;

	return if type::is_number($TOTAL) {
		return $TOTAL;
	} else {
		return 0;
	};
};
