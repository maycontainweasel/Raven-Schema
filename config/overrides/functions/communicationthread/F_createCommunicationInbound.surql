DEFINE FUNCTION OVERWRITE fn::createCommunicationInbound($payload: object) {

	if !$payload {
		throw "createCommunicationInbound | payload is required";
	};

	if !$payload.thread {
		throw "createCommunicationInbound | thread payload is required";
	};
	if !$payload.message {
		throw "createCommunicationInbound | message payload is required";
	};

	let $threadPayload = $payload.thread;
	let $messagePayload = $payload.message;

	let $threadRecord = if $threadPayload.id {
		let $rid = fn::ridParam("commThread", $threadPayload.id);
		if !type::is_record($rid) || !record::exists($rid) {
			throw "createCommunicationInbound | thread id is invalid";
		};
		SELECT * FROM only $rid;
	} else {
		fn::createCommunicationThread($threadPayload);
	};

	let $threadRecord = if type::is_array($threadRecord) { array::first($threadRecord) } else { $threadRecord };

	let $threadRid = if type::is_record($threadRecord) {
		$threadRecord
	} else if $threadRecord.id {
		$threadRecord.id
	} else {
		$threadRecord
	};

	if !type::is_record($threadRid) || !record::exists($threadRid) {
		throw "createCommunicationInbound | failed to resolve thread record";
	};

	let $messagePayload = fn::objectAssign($messagePayload, {
		thread: $threadRid,
	});

	let $messageRecord = fn::createCommunicationMessage($messagePayload);
	let $messageRid = if type::is_record($messageRecord) {
		$messageRecord
	} else if $messageRecord.id {
		$messageRecord.id
	} else {
		$messageRecord
	};

	if !type::is_record($messageRid) || !record::exists($messageRid) {
		throw "createCommunicationInbound | failed to create message";
	};

	let $existingMessageIds = if type::is_array($threadRecord.messageIds) { $threadRecord.messageIds } else { [] };
	let $nextMessageIds = array::concat($existingMessageIds, [$messageRid]);

	let $existingUnread = if $threadRecord.unreadAdminCount != NONE { $threadRecord.unreadAdminCount } else { 0 };

	let $firstMessageCandidate = fn::ridParam("commMessage", $threadRecord.firstMessage);
	let $hasFirstMessage = type::is_record($firstMessageCandidate) && record::exists($firstMessageCandidate);

	let $updatePayload = {
		firstMessage: if $hasFirstMessage { $firstMessageCandidate } else { $messageRid },
		lastMessage: $messageRid,
		messageIds: $nextMessageIds,
		unreadAdminCount: ($existingUnread + 1),
		updatedAt: time::now(),
		lastMessageAt: time::now(),
	};

	let $updatedThread = fn::updateCommunicationThread($threadRid, $updatePayload);

	return {
		thread: $updatedThread,
		message: $messageRecord,
	};

};
