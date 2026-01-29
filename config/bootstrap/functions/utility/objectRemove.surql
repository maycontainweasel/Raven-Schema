DEFINE FUNCTION fn::objectRemove($obj: object, $keys: array) {
	IF !type::is_object($obj) {
		RETURN $obj;
	};
	LET $entries = object::entries($obj);
	LET $result = $entries.fold({ keys: $keys, out: [] }, |$acc, $entry| {
		LET $key = $entry[0];
		IF $key IN $acc.keys {
			RETURN $acc;
		};
		RETURN {
			keys: $acc.keys,
			out: array::push($acc.out, $entry)
		};
	});
	RETURN object::from_entries($result.out);
};
