DEFINE EVENT OVERWRITE UserQuestionPerformanceRecordDelete ON TABLE uqpr WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromOut($id, 'UserQuestionPerformanceRecord', false);
};