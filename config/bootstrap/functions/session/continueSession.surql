DEFINE FUNCTION OVERWRITE fn::continueSession($SID: record) {
	if !type::is_record($SID) || !record::exists($SID) {
		throw "continueSession | expects a valid session record";
	};

	return select
		id,
		(<string> $this.uuid) as uuid
	from only $SID;
};
