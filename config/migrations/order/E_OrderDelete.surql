DEFINE EVENT OVERWRITE OrderDelete ON TABLE order WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromIn($id, 'OrderItem', true);
  fn::deleteEdgeFromIn($id, 'OrderEvent', true);
};