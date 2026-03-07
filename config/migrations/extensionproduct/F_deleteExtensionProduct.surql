DEFINE FUNCTION OVERWRITE fn::deleteExtensionProduct($ExtensionProductID: any) {

	let $rid = fn::ridParam("extensionProduct", $ExtensionProductID);


	if !type::is_record($rid) || !record::exists($rid) {
		return null;
	};

	let $result = (delete only $rid return before);

	delete from OrderExtensionProduct where out = $rid;
	delete from VariantExtensionProduct where out = $rid;

	return if $result {
		return $result['id'];
	} else {
		throw "deleteExtensionProduct | failed to delete ExtensionProduct";
	}

};
