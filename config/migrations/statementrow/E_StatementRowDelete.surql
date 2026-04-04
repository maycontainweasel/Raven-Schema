DEFINE EVENT OVERWRITE StatementRowDelete ON TABLE statementRow WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromIn($id, 'StatementRowTransactions', false);
};