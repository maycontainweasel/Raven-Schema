DEFINE FUNCTION overwrite fn::stringJoin($values: array, $separator: option<string>) {

  let $separator = if $separator {
    $separator;
  } else {
    "-";
  };

	return array::join($values, $separator);
};