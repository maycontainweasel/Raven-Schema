DEFINE EVENT OVERWRITE OrderEventDelete ON TABLE orderEvent WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromOut($id, 'OrderEvent', false);
};