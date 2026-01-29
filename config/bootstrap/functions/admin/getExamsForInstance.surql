
DEFINE FUNCTION fn::getExamsForInstance($INSTANCE_KEY: string) {

if !($INSTANCE_KEY || type::is_string($INSTANCE_KEY)) {
  THROW "getExamsForInstance | valid instance key is required";
};

return select * from exam where instances contains $INSTANCE_KEY;

};
