DEFINE FUNCTION overwrite fn::stringID($values: array, $separator: option<string>) {

	let $separator = $separator ?? '|';

	let $processed = $values.map(|$v| if type::is_record($v) { 
		string::concat(record::tb($v),":",record::id($v)) 
	} else { 
		string::trim(<string> $v);
	});
	
	return array::join($processed, $separator);
};