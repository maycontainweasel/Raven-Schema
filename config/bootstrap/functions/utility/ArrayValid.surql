DEFINE FUNCTION fn::ArrayValid($array: array) {
  // Opinionated function to check if an array is valid, i.e. not empty and not null
  return if fn::isArr($array) && fn::isEmptyArr($array) {
    return true
  } else {
    return false
  };
};