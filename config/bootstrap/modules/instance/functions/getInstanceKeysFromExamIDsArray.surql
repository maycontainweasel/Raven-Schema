DEFINE FUNCTION fn::getInstanceKeysFromExamIDsArray($EXAM_KEYS: array) {

if !($EXAM_KEYS || type::is_array($EXAM_KEYS)) {
  THROW "getInstanceKeysFromExamIDsArray | valid exam keys array is required";
};


return (select value 
	(fn::getRecordInstanceKeys($this)) as keys 
from $EXAM_KEYS).flatten();

};

