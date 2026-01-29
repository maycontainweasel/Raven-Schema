DEFINE FUNCTION fn::getTerm($table: string, $tax: string, $key: string, $termTable: option<string>) {
	let $meta = fn::getTaxonomyMeta($table, $tax);
	if $meta {
		let $TERM_ID = fn::ridParam($meta.termModel ?? "term", $key);
		if type::is_record($TERM_ID) && record::exists($TERM_ID) {
			return select * from only $TERM_ID;
		} else {
			return null;
		};
	};
	
	let $TABLE = if $termTable && $termTable != "" {
		$termTable;
	} else {
		string::concat("t_", $table, "_", $tax);
	};

	let $termID = type::record($TABLE, $key);

	if(type::is_record($termID) && record::exists($termID)) {
		return select * from only $termID;
	} else {
		return null;
	};

};
