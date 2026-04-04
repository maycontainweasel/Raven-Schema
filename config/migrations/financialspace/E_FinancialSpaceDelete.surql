DEFINE EVENT OVERWRITE FinancialSpaceDelete ON TABLE financialSpace WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromIn($id, 'FinancialSpaceAccounts', false);
};