DEFINE FUNCTION fn::ridParam($model: string, $value: any) {
  if !$model || !type::is_string($model) {
    throw "ridParam | model is required";
  };

  if $value == NONE {
    return NONE;
  };

  let $RID = if type::is_record($value) {
    $value
  } else if type::is_object($value) && $value.tb && $value.id {
    if $value.id == NONE { NONE } else { type::record($value.tb, $value.id) }
  } else if type::is_object($value) && $value.id {
    if $value.id == NONE { NONE } else { type::record($model, $value.id) }
  } else if type::is_object($value) {
    NONE
  } else if type::is_string($value) {
    let $trim = string::trim($value);
    if $trim == "" {
      NONE
    } else {
      let $parts = string::split($trim, ":");
      if array::len($parts) > 1 {
        let $tb = $parts[0];
        let $key = $parts[array::len($parts) - 1];
        if string::matches($key, '^-?\\d+$') { type::record($tb, <int> $key) } else { type::record($tb, $key) }
      } else if string::matches($trim, '^-?\\d+$') {
        type::record($model, <int> $trim)
      } else {
        type::record($model, $trim)
      }
    }
  } else {
    type::record($model, $value)
  };

  if type::is_record($RID) {
    let $id = record::id($RID);
    if type::is_string($id) {
      if string::matches($id, '^-?\\d+$') {
        return type::record(record::tb($RID), <int> $id);
      };
    };
  };

  return $RID;
};
