DEFINE FUNCTION fn::RIDExists($RID: record) {
  return if $RID && type::is_record($RID) && record::exists($RID) {
    return true
  } else {
    return false;
  };
};