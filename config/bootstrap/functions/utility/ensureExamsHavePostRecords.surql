DEFINE FUNCTION OVERWRITE fn::ensureExamsHavePostRecords() {
  let $examIDs = select value id from exam;

  if(!fn::RIDValid(fn::PID($examID))) {
      fn::createPost({
        id: $examID,
        title: (select value title from only $examID)
      });
      fn::attachRecordToPost($examID);
  };
}