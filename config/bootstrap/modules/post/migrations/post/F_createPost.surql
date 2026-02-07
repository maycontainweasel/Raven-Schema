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

	return if $record {
		return $record;
	} else {
		throw "createPost | failed to create p";
	}

};

