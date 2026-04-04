DEFINE FUNCTION OVERWRITE fn::updateLastActivityTS($SID: record, $timestamp: option<any>) {
	if !type::is_record($SID) || !record::exists($SID) {
		throw "updateLastActivityTS | expects a valid session record";
	};

	let $TS = if type::is_datetime($timestamp) {
		return $timestamp;
	} else {
		return time::now();
	};

	return update only $SID set
		dateLastActive = $TS,
		dateLastTouch = $TS;
};
