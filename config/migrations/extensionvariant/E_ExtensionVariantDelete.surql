DEFINE EVENT OVERWRITE ExtensionVariantDelete ON TABLE extensionVariant WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromOut($id, 'ExtensionVariant', false);
};