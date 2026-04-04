DEFINE EVENT OVERWRITE TransactionDelete ON TABLE transaction WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromIn($id, 'TransactionMerchant', false);
  fn::deleteEdgeFromIn($id, 'TransactionCategory', false);
  fn::deleteEdgeFromIn($id, 'TransactionClarificationTasks', false);
};