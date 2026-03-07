DEFINE EVENT OVERWRITE SessionDelete ON TABLE s WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteSessionPerformanceRecord(type::record('spr', record::id($id)));
  fn::deleteEdgeFromIn($id, 'SessionPerformanceRecord', false);
  fn::deleteEdgeFromIn($id, 'SessionCategoryRecord', true);
  fn::deleteSessionEvent(type::record('se', record::id($id)));
  fn::deleteEdgeFromIn($id, 'SessionEvent', false);
};