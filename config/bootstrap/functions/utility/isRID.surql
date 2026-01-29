DEFINE FUNCTION fn::isRID($RID: record) {
  return if type::is_record($RID) {
    return true
  } else {
    return false;
  };
};