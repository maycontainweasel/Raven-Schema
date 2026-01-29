DEFINE FUNCTION overwrite fn::clearEdgesForRecord(
	$RID: record,
	$edgeTable: string,
	$options: option<object>
) {
	let $defaults = {
		from: "in" // in | out | both
	};

	if !type::is_record($RID) {
		throw "clearEdgesForRecord | invalid record";
	};
	if !type::is_string($edgeTable) {
		throw "clearEdgesForRecord | invalid edge table name";
	};

	let $options = fn::objectAssign($defaults, $options ?? {});
	let $from = if type::is_object($options) && type::is_string($options.from) {
		$options.from
	} else {
		"in"
	};

	let $edge = type::table($edgeTable);

	return if $from == "both" {
		let $left = delete from $edge where in = $RID return BEFORE;
		let $right = delete from $edge where out = $RID return BEFORE;
		array::concat($left ?? [], $right ?? []);
	} else if $from == "out" {
		delete from $edge where out = $RID return BEFORE;
	} else {
		delete from $edge where in = $RID return BEFORE;
	};
};
