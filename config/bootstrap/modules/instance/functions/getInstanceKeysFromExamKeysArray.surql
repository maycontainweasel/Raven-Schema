DEFINE FUNCTION fn::getInstanceKeysFromExamKeysArray($EXAM_KEYS: array) {

if !($EXAM_KEYS || type::is_array($EXAM_KEYS)) {
  THROW "getInstanceKeysFromExamKeysArray | valid exam keys array is required";
};


return (select value 
	(fn::getRecordInstanceKeys(type::record('exam', $this))) as keys 
from $EXAM_KEYS).flatten();

};

