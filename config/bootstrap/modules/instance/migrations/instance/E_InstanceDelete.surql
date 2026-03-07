DEFINE EVENT OVERWRITE InstanceDelete ON TABLE instance WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteInstanceSettings(type::record('instanceSettings', record::id($id)));
  fn::deleteEdgeFromIn($id, 'InstanceSettings', false);
  fn::deleteEdgeFromIn($id, 'Instances', false);
};