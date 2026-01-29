DEFINE FUNCTION overwrite fn::createEdge(
	$in: record,
	$edgeTable: string,
	$out: record,
	$options: option<object>
) {
	let $defaults = {
		boundId: true,
		overwrite: false,
		skipExists: false,
		data: {}
	};

	if !type::is_record($in) {
		throw "createEdge | invalid in record";
	};
	if !type::is_record($out) {
		throw "createEdge | invalid out record";
	};
	if !type::is_string($edgeTable) {
		throw "createEdge | invalid edge table name";
	};

	let $options = fn::objectAssign($defaults, $options ?? {});
	let $skipExists = if type::is_object($options) && $options.skipExists {
		$options.skipExists
	} else {
		false
	};

	if !$skipExists && !fn::RIDExists($in) {
		throw "createEdge | in record does not exist";
	};
	if !$skipExists && !fn::RIDExists($out) {
		throw "createEdge | out record does not exist";
	};

	let $edge = type::table($edgeTable);
	let $edgeId = if $options.boundId {
		type::record($edgeTable, fn::stringID([$in, $out]))
	} else {
		type::record($edgeTable, rand::ulid())
	};
	let $payload = fn::objectAssign({
		id: $edgeId,
		in: $in,
		out: $out
	}, if type::is_object($options.data) { $options.data } else { {} });

	if $options.overwrite {
		delete from $edge where in = $in and out = $out;
	};

	let $existing = select * from $edge where in = $in and out = $out;

	return if !$existing || array::len($existing) = 0 {
		INSERT RELATION INTO $edge $payload;
	} else {
		array::first($existing)
	};
};
