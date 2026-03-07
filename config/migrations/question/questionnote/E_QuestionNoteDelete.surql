DEFINE EVENT OVERWRITE QuestionNoteDelete ON TABLE qnote WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromOut($id, 'QuestionNote', false);
};