DEFINE FUNCTION fn::objectAssign($obj1: object, $obj2: object) {
  LET $entries1 = object::entries($obj1);
  LET $entries2 = object::entries($obj2);

  LET $combinedEntries = array::concat($entries1, $entries2);

  RETURN object::from_entries($combinedEntries);
};

