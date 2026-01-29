DEFINE FUNCTION overwrite fn::deleteEdge(
	$in: record,
	$edgeTable: string,
	$out: record,
	$options: option<object>
) {
	let $defaults = {
		boundId: true,
		deleteAll: false
	};

	if !type::is_record($in) {
		throw "deleteEdge | invalid in record";
	};
	if !type::is_record($out) {
		throw "deleteEdge | invalid out record";
	};
	if !type::is_string($edgeTable) {
		throw "deleteEdge | invalid edge table name";
	};

	let $options = fn::objectAssign($defaults, $options ?? {});
	let $edge = type::table($edgeTable);

	if $options.boundId {
		let $edgeId = type::record($edgeTable, fn::stringID([$in, $out]));
		let $result = delete $edgeId return BEFORE;
		return if type::is_array($result) { array::first($result) } else { $result };
	} else {
		if $options.deleteAll {
			return delete from $edge where in = $in and out = $out return BEFORE;
		};

		let $edgeId = array::first(select value id from $edge where in = $in and out = $out);
		return if type::is_record($edgeId) {
			let $result = delete $edgeId return BEFORE;
			return if type::is_array($result) { array::first($result) } else { $result };
		} else {
			null;
		};
	};
};
