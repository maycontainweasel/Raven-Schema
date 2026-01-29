DEFINE FUNCTION fn::toRecordArray($model: string, $values: any) {
	if !$model || !type::is_string($model) {
		throw "toRecordArray | $model is required";
	};

	let $list = if type::is_array($values) {
		$values;
	} else if $values {
		[$values];
	} else {
		[];
	};

	let $filtered = array::filter($list, |$item| $item != NONE);
	if array::len($filtered) < array::len($list) {
		throw "toRecordArray | values contain NONE";
	};

	let $mapped = $filtered.map(|$item| {
		if $item == NONE {
			NONE
		} else if type::is_string($item) {
			let $trim = string::trim($item);
			if $trim == "" { NONE } else { fn::ridParam($model, $item) }
		} else {
			fn::ridParam($model, $item)
		}
	});
	let $normalized = array::filter($mapped, |$item| $item != NONE);
	if array::len($normalized) < array::len($mapped) {
		throw "toRecordArray | invalid value in list";
	};

	return $normalized;
};
