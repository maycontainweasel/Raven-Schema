DEFINE EVENT OVERWRITE StatementImportDelete ON TABLE statementImport WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromIn($id, 'StatementImportRows', false);
};