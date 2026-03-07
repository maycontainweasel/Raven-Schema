DEFINE EVENT OVERWRITE InstanceSettingsDelete ON TABLE instanceSettings WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromOut($id, 'InstanceSettings', false);
};