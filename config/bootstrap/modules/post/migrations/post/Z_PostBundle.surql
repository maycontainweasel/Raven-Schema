-- ========================================
-- Table Bundle: Post
-- ========================================

-- ---------- FUNCTIONS ----------

-- File: F_createPost.surql
DEFINE FUNCTION OVERWRITE fn::createPost($payload: object) {

	if !$payload {
		throw "createPost | payload is required";
	};

	if $payload.id = NONE || $payload.id = null || (type::is_string($payload.id) && string::len($payload.id) = 0) {
		throw "createPost | requires id";
	};

	let $defaultData = {
		contentTable: record::tb($payload.id),
		contentId: record::id($payload.id),
		createdAt: time::now(),
		updatedAt: time::now(),
		publishedAt: null,
		title: $payload.title ?? record::id($payload.id),
		permalink: if($payload.title) {
      string::slug(<string> $payload.title)
  } else {
      string::slug(<string> record::id($payload.id))
  },
		status: "draft",
	};

	let $payload = fn::objectAssign($defaultData, $payload);

	let $rid = fn::PID($payload.id);
	let $payload = fn::objectRemove($payload, ["id"]);
	let $record = upsert $rid content $payload;
	let $record = if type::is_array($record) { array::first($record) } else { $record };

	let $record = if $record { $record } else {
		let $fallback = select * from only $rid;
		if type::is_array($fallback) { array::first($fallback) } else { $fallback };
	};

	let $recordID = if type::is_object($record) && type::is_record($record.id) {
		$record.id
	} else if type::is_record($record) {
		$record
	} else {
		null
	};

	if !$recordID {
		throw "createPost | failed to create p";
	};

	return if $record {
		return $record;
	} else {
		throw "createPost | failed to create p";
	}

};

-- File: F_deletePost.surql
DEFINE FUNCTION OVERWRITE fn::deletePost($PostID: any) {

	let $RID = fn::ridParam("p", $PostID);
	let $rid = if type::is_record($RID) && record::tb($RID) == "p" { $RID } else { fn::PID($RID) };

	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deletePost | failed to delete Post";
	}

};

-- File: F_updatePost.surql
DEFINE FUNCTION OVERWRITE fn::updatePost($PostID: any, $payload: object) {

	let $RID = fn::ridParam("p", $PostID);
	let $rid = if type::is_record($RID) && record::tb($RID) == "p" { $RID } else { fn::PID($RID) };

	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updatePost | payload is required";
	};

	let $result = update $rid merge $payload;
	let $result = if type::is_array($result) { array::first($result) } else { $result };

	return if $result {
		return $result;
	} else {
		throw "updatePost | failed to update Post";
	}

};


-- ---------- EVENTS ----------

-- File: E_Post.surql
DEFINE EVENT OVERWRITE PostDelete ON TABLE p WHEN $event = "DELETE" THEN {
  let $id = $before.id;
  if !$id {
    return null;
  };

  fn::deleteEdgeFromIn($id, 'Post', false);
};


-- ---------- EDGES ----------

-- File: L_pEdges.surql
DEFINE TABLE OVERWRITE Post SCHEMAFULL TYPE RELATION IN p;
DEFINE FIELD OVERWRITE in ON TABLE Post TYPE record<p>;
DEFINE FIELD OVERWRITE out ON TABLE Post;
DEFINE INDEX OVERWRITE Post_unique ON TABLE Post FIELDS in, out UNIQUE;

