DEFINE EVENT OVERWRITE ExtensionProductDelete ON TABLE extensionProduct WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromIn($id, 'ExtensionVariant', true);
};