DEFINE FUNCTION OVERWRITE fn::ridParam($model: string, $value: any) {
  if !$model || !type::is_string($model) {
    throw "ridParam | model is required";
  };

  if $value == NONE || $value = null {
    return NONE;
  };

  let $source = if type::is_array($value) {
    NONE
  } else if type::is_object($value) && $value.tb != NONE && $value.tb != null && $value.id != NONE && $value.id != null {
    string::concat(<string> $value.tb, ":", <string> $value.id)
  } else if type::is_object($value) && $value.id != NONE && $value.id != null {
    <string> $value.id
  } else if type::is_object($value) {
    NONE
  } else {
    <string> $value
  };

  if $source == NONE || $source = null {
    return NONE;
  };

  let $raw = string::trim($source);
  let $raw = string::replace($raw, "`", "");
  let $raw = string::replace($raw, "⟨", "");
  let $raw = string::replace($raw, "⟩", "");
  let $raw = string::replace($raw, "<", "");
  let $raw = string::replace($raw, ">", "");
  let $raw = string::replace($raw, "{", "");
  let $raw = string::replace($raw, "}", "");
  let $raw = string::trim($raw);

  if $raw == "" {
    return NONE;
  };

  let $parts = string::split($raw, ":");
  let $tb = if array::len($parts) > 1 {
    string::trim($parts[0])
  } else {
    $model
  };
  let $key = if array::len($parts) > 1 {
    string::trim($parts[array::len($parts) - 1])
  } else {
    $raw
  };

  if $tb == "" || $key == "" {
    return NONE;
  };

  return if string::matches($key, '^-?\\d+$') {
    type::record($tb, <int> $key)
  } else {
    type::record($tb, $key)
  };
};
