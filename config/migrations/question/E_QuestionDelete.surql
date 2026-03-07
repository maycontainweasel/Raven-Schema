DEFINE EVENT OVERWRITE QuestionDelete ON TABLE q WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromIn($id, 'QuestionOption', true);
  fn::deleteQuestionPerformanceRecord(type::record('qpr', record::id($id)));
  fn::deleteEdgeFromIn($id, 'QuestionPerformanceRecord', false);
  fn::deleteEdgeFromIn($id, 'UserQuestionPerformanceRecord', true);
  fn::deleteEdgeFromIn($id, 'QuestionNote', true);
  fn::deleteEdgeFromIn($id, 'UserQuestionNote', true);
};