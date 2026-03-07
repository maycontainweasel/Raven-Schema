DEFINE EVENT OVERWRITE OrderItemDelete ON TABLE orderItem WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromOut($id, 'OrderItem', false);
};