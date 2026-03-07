DEFINE FUNCTION OVERWRITE fn::deleteExtensionVariant($ExtensionVariantID: any) {

	let $rid = fn::ridParam("extensionVariant", $ExtensionVariantID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	delete from ExtensionVariants where out = $rid;
	delete from OrderExtensionVariant where out = $rid;

	return if $result {
		return $result['id'];
	} else {
		throw "deleteExtensionVariant | failed to delete ExtensionVariant";
	}

};
