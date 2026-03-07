DEFINE EVENT OVERWRITE ProductVariantDelete ON TABLE productVariant WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromOut($id, 'ProductVariant', false);
  fn::deleteEdgeFromOut($id, 'ProductVariants', false);
};