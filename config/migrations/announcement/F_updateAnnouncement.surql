DEFINE FUNCTION OVERWRITE fn::updateAnnouncement($AnnouncementID: any, $payload: object) {

	let $rid = fn::ridParam("announcement", $AnnouncementID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateAnnouncement | payload is required";
	};

	let $current = (select * from $rid)[0];

	if $payload.style != NONE {
		if !($payload.style IN ["banner", "flyout", "modal"]) {
			throw "updateAnnouncement | invalid style";
		};
	};
	if $payload.severity != NONE {
		if !($payload.severity IN ["info", "success", "warning", "danger"]) {
			throw "updateAnnouncement | invalid severity";
		};
	};

	let $result = update $rid merge $payload;
	let $result = if type::is_array($result) { array::first($result) } else { $result };

	// --- Refresh Record views
	update $rid merge {
		"touch": 1
	};
	update $rid unset touch;

	let $PID = fn::PID($rid);

	if(type::is_record($PID) && record::exists($PID)) {
		update $PID merge {
			"touch": 1
		};
		update $PID unset touch;
	};
	// --- End Refresh Record views

	return if $result {
		return $result;
	} else {
		throw "updateAnnouncement | failed to update Announcement";
	}

};
