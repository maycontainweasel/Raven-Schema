DEFINE FUNCTION fn::isArray($array: array) {
  return if type::is_array($array) {
    return true
  } else {
    return false;
  };
};