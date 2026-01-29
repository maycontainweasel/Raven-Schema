DEFINE EVENT OVERWRITE QuestionRecordDelete ON TABLE qRecord WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromOut($id, 'QuestionRecord', false);
};
