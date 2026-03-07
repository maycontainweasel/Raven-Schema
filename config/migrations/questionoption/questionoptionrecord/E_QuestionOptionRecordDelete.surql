DEFINE EVENT OVERWRITE QuestionOptionRecordDelete ON TABLE qor WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromOut($id, 'QuestionOptionRecord', false);
};