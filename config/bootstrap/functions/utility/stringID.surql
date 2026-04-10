DEFINE FUNCTION overwrite fn::stringID($values: array, $separator: option<string>) {

	let $separator = $separator ?? '|';

	let $processed = $values.map(|$v| {
		let $raw = if $v = NONE || $v = null {
			""
		} else if type::is_object($v) && $v.tb != NONE && $v.tb != null && $v.id != NONE && $v.id != null {
			string::concat(<string> $v.tb, ":", <string> $v.id)
		} else if type::is_object($v) && $v.id != NONE && $v.id != null {
			<string> $v.id
		} else {
			<string> $v
		};
		let $raw = string::trim($raw);
		let $raw = string::replace($raw, "`", "");
		let $raw = string::replace($raw, "⟨", "");
		let $raw = string::replace($raw, "⟩", "");
		let $raw = string::replace($raw, "<", "");
		let $raw = string::replace($raw, ">", "");
		let $raw = string::replace($raw, "{", "");
		let $raw = string::replace($raw, "}", "");
		string::trim($raw);
	});
	
	return array::join($processed, $separator);
};
