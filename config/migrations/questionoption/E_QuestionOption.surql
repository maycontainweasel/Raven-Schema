DEFINE EVENT OVERWRITE QuestionOptionCreateSubTables ON TABLE qOption WHEN $event = "CREATE" THEN {
  let $PARENT_ID = $after.id;
  if !type::is_record($PARENT_ID) {
    throw "QuestionOptionCreateSubTables | invalid parent record id";
  };
  fn::createQuestionOptionRecord($PARENT_ID, { skipExists: true });
} COMMENT "Auto-generated to ensure required sub tables exist when the parent is created.";

DEFINE EVENT OVERWRITE QuestionOptionDelete ON TABLE qOption WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteQuestionOptionRecord(type::record('qor', record::id($id)));
  fn::deleteEdgeFromIn($id, 'QuestionOptionRecord', false);
  fn::deleteEdgeFromIn($id, 'UserQuestionOptionRecord', true);
  fn::deleteEdgeFromOut($id, 'QuestionOption', false);
};
