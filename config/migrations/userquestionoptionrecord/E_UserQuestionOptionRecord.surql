DEFINE EVENT OVERWRITE UserQuestionOptionRecordDelete ON TABLE uqor WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromOut($id, 'UserQuestionOptionRecord', false);
};
