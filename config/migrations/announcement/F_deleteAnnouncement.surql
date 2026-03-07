DEFINE FUNCTION OVERWRITE fn::deleteAnnouncement($AnnouncementID: any) {

	let $rid = fn::ridParam("announcement", $AnnouncementID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	return if $result {
		return $result['id'];
	} else {
		throw "deleteAnnouncement | failed to delete Announcement";
	}

};
