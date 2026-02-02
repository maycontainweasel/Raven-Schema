DEFINE FUNCTION OVERWRITE fn::initTaxonomies() {

	fn::createQuestionQcatTaxonomy({});
	fn::createQuestionQtagTaxonomy({});
	fn::createUserRoleTaxonomy({});

	return true;

};