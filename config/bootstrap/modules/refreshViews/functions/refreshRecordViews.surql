DEFINE FUNCTION fn::refreshRecordViews($RID: record, $preventPostUpdate: option<bool>) {
  if !type::is_record($RID) || !record::exists($RID) {
    THROW "refreshRecordViews | Record ID is required";
  };

  update $RID merge {
    "touch": time::now()
  };
  update $RID unset touch;

  if !$preventPostUpdate {
    let $PID = fn::PID($RID);

    if !$PID || !fn::RIDExists($PID) {
      fn::createPost({
        id: $RID,
        title: <string> record::id($RID)
      });
    };

    update $PID merge {
      "touch": time::now()
    };
    update $PID unset touch;
  }

};
