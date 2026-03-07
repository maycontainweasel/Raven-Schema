DEFINE EVENT OVERWRITE SessionPerformanceRecordDelete ON TABLE spr WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromOut($id, 'SessionPerformanceRecord', false);
};