DEFINE EVENT OVERWRITE AccountDelete ON TABLE account WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromIn($id, 'AccountStatementImports', false);
  fn::deleteEdgeFromIn($id, 'AccountTransactions', false);
};