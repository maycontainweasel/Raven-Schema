DEFINE FUNCTION overwrite fn::updateEdge(
	$in: record,
	$edgeTable: string,
	$out: record,
	$payload: object,
	$options: option<object>
) {
	let $defaults = {
		boundId: true,
		findAll: false,
		createOnMissing: false,
		skipExists: false
	};

	if !type::is_record($in) {
		throw "updateEdge | invalid in record";
	};
	if !type::is_record($out) {
		throw "updateEdge | invalid out record";
	};
	if !type::is_string($edgeTable) {
		throw "updateEdge | invalid edge table name";
	};
	if !type::is_object($payload) {
		throw "updateEdge | payload is required";
	};

	let $options = fn::objectAssign($defaults, $options ?? {});
	let $edge = type::table($edgeTable);

	if $options.boundId {
		let $edgeId = type::record($edgeTable, fn::stringID([$in, $out]));
		if $options.createOnMissing && !fn::RIDExists($edgeId) {
			fn::createEdge($in, $edgeTable, $out, {
				boundId: true,
				overwrite: false,
				skipExists: $options.skipExists,
				data: $payload
			});
			return $edgeId;
		};

		return update only $edgeId merge $payload;
	} else {
		let $ids = select value id from $edge where in = $in and out = $out;
		if (!$ids || array::len($ids) == 0) {
			if $options.createOnMissing {
				fn::createEdge($in, $edgeTable, $out, {
					boundId: true,
					overwrite: false,
					skipExists: $options.skipExists,
					data: $payload
				});
				return type::record($edgeTable, fn::stringID([$in, $out]));
			};
			return null;
		};

		if $options.findAll {
			return update $ids merge $payload;
		};

		return update only array::first($ids) merge $payload;
	};
};
