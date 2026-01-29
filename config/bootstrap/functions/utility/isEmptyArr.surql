DEFINE FUNCTION fn::isEmptyArr($array: array) {
  return if fn::isArr($array) && fn::ArrCount($array) == 0 {
    return true
  } else {
    return false;
  };
};