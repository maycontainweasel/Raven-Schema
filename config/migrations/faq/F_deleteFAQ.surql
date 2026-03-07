DEFINE FUNCTION OVERWRITE fn::deleteFAQ($FAQID: any) {

	let $rid = fn::ridParam("faq", $FAQID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	delete from FAQFaqCategorys where in = $rid;

	return if $result {
		return $result['id'];
	} else {
		throw "deleteFAQ | failed to delete FAQ";
	}

};
