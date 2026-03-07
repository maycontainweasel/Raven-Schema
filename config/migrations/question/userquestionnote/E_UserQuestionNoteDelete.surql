DEFINE EVENT OVERWRITE UserQuestionNoteDelete ON TABLE uqnote WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromOut($id, 'UserQuestionNote', false);
};