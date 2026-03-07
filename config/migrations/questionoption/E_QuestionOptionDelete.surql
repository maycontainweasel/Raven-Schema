DEFINE EVENT OVERWRITE QuestionOptionDelete ON TABLE qOption WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteQuestionOptionRecord(type::record('qor', record::id($id)));
  fn::deleteEdgeFromIn($id, 'QuestionOptionRecord', false);
  fn::deleteEdgeFromIn($id, 'UserQuestionOptionRecord', true);
  fn::deleteEdgeFromOut($id, 'QuestionOption', false);
};