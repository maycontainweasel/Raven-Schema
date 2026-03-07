DEFINE FUNCTION OVERWRITE fn::deleteNotification($NotificationID: any) {

	let $rid = fn::ridParam("notification", $NotificationID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteNotification | failed to delete Notification";
	}

};
