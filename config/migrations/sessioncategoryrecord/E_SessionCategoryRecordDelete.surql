DEFINE EVENT OVERWRITE SessionCategoryRecordDelete ON TABLE scr WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromOut($id, 'SessionCategoryRecord', false);
};