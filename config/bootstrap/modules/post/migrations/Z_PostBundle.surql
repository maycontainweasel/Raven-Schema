-- ========================================
-- Table Bundle: Post
-- ========================================

-- ---------- FUNCTIONS ----------

-- File: F_createPost.surql
DEFINE FUNCTION OVERWRITE fn::createPost($payload: object) {

	if !$payload {
		throw "createPost | payload is required";
	};

	if !$payload.id {
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

	return if $record {
		return $record;
	} else {
		throw "createPost | failed to create p";
	}

};

-- File: F_deletePost.surql
DEFINE FUNCTION OVERWRITE fn::deletePost($PostID: any, $options: option<object>) {

	let $defaults = {
		skipExists: false,
		allowMissing: true
	};
	let $options = fn::objectAssign($defaults, $options ?? {});

	let $RID = fn::ridParam("p", $PostID);
	let $rid = if type::is_record($RID) && record::tb($RID) == "p" { $RID } else { fn::PID($RID) };

	if !type::is_record($rid) {
		return null;
	};
	if !$options.skipExists && !record::exists($rid) {
		return if $options.allowMissing { null } else { throw "deletePost | Post not found"; };
	};

	let $result = delete $rid return before;
	let $result = if type::is_array($result) { array::first($result) } else { $result };

	return if $result {
		return $result['id'] ?? $result.id ?? $result;
	} else {
		return if $options.allowMissing { null } else { throw "deletePost | failed to delete Post"; };
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
