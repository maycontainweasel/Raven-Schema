DEFINE FUNCTION OVERWRITE fn::updateNotification($NotificationID: any, $payload: object) {

	let $rid = fn::ridParam("notification", $NotificationID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	if !$payload {
		throw "updateNotification | payload is required";
	};

	let $current = (select * from $rid)[0];

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
		throw "updateNotification | failed to update Notification";
	}

};
