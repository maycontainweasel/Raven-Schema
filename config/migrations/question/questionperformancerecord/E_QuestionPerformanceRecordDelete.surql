DEFINE EVENT OVERWRITE QuestionPerformanceRecordDelete ON TABLE qpr WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromOut($id, 'QuestionPerformanceRecord', false);
};