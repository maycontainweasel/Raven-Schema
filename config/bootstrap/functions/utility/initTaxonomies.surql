DEFINE FUNCTION OVERWRITE fn::initTaxonomies() {

	fn::createFAQFaqCategoryTaxonomy({});
	fn::createQuestionQcatTaxonomy({});
	fn::createQuestionQtagTaxonomy({});
	fn::createQuestionQtopicTaxonomy({});
	fn::createUserRoleTaxonomy({});

	return true;

};