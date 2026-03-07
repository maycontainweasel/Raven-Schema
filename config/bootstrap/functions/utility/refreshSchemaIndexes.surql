DEFINE FUNCTION OVERWRITE fn::schemaIndexRegistry() {
	return [
		{ table: "ExamAttempts", name: "ExamAttempts_unique" },
		{ table: "ExamBuilderPage", name: "ExamBuilderPage_unique" },
		{ table: "ExamQuestions", name: "ExamQuestions_unique" },
		{ table: "ExamSessions", name: "ExamSessions_unique" },
		{ table: "ExtensionVariant", name: "ExtensionVariant_unique" },
		{ table: "ExtensionVariants", name: "ExtensionVariants_unique" },
		{ table: "FAQFaqCategorys", name: "FAQFaqCategorys_unique" },
		{ table: "FAQFaqCategoryTerms", name: "FAQFaqCategoryTerms_unique" },
		{ table: "instance", name: "InstanceKey" },
		{ table: "Instances", name: "Instances_unique" },
		{ table: "InstanceSettings", name: "InstanceSettings_unique" },
		{ table: "OrderEvent", name: "OrderEvent_unique" },
		{ table: "OrderExtensionProduct", name: "OrderExtensionProduct_unique" },
		{ table: "OrderExtensionVariant", name: "OrderExtensionVariant_unique" },
		{ table: "OrderItem", name: "OrderItem_unique" },
		{ table: "OrderProduct", name: "OrderProduct_unique" },
		{ table: "OrderProductVariant", name: "OrderProductVariant_unique" },
		{ table: "OrderTrialProduct", name: "OrderTrialProduct_unique" },
		{ table: "OrganisationUsers", name: "OrganisationUsers_unique" },
		{ table: "Post", name: "Post_unique" },
		{ table: "ProductExams", name: "ProductExams_unique" },
		{ table: "ProductOrders", name: "ProductOrders_unique" },
		{ table: "ProductVariant", name: "ProductVariant_unique" },
		{ table: "ProductVariants", name: "ProductVariants_unique" },
		{ table: "QuestionAttempts", name: "QuestionAttempts_unique" },
		{ table: "QuestionNote", name: "QuestionNote_unique" },
		{ table: "QuestionOption", name: "QuestionOption_unique" },
		{ table: "QuestionOptionRecord", name: "QuestionOptionRecord_unique" },
		{ table: "QuestionPerformanceRecord", name: "QuestionPerformanceRecord_unique" },
		{ table: "QuestionQcats", name: "QuestionQcats_unique" },
		{ table: "QuestionQcatTerms", name: "QuestionQcatTerms_unique" },
		{ table: "QuestionQtags", name: "QuestionQtags_unique" },
		{ table: "QuestionQtagTerms", name: "QuestionQtagTerms_unique" },
		{ table: "QuestionQtopics", name: "QuestionQtopics_unique" },
		{ table: "QuestionQtopicTerms", name: "QuestionQtopicTerms_unique" },
		{ table: "SessionAttempts", name: "SessionAttempts_unique" },
		{ table: "SessionCategories", name: "SessionCategories_unique" },
		{ table: "SessionCategoryRecord", name: "SessionCategoryRecord_unique" },
		{ table: "SessionCategoryRecords", name: "SessionCategoryRecords_unique" },
		{ table: "SessionEvent", name: "SessionEvent_unique" },
		{ table: "SessionLog", name: "SessionLog_unique" },
		{ table: "SessionPerformanceRecord", name: "SessionPerformanceRecord_unique" },
		{ table: "SessionQuestions", name: "SessionQuestions_unique" },
		{ table: "SessionRecord", name: "SessionRecord_unique" },
		{ table: "UserAttempts", name: "UserAttempts_unique" },
		{ table: "UserQuestionNote", name: "UserQuestionNote_unique" },
		{ table: "UserQuestionOptionRecord", name: "UserQuestionOptionRecord_unique" },
		{ table: "UserQuestionPerformanceRecord", name: "UserQuestionPerformanceRecord_unique" },
		{ table: "UserRoles", name: "UserRoles_unique" },
		{ table: "UserRoleTerms", name: "UserRoleTerms_unique" },
		{ table: "UserSessions", name: "UserSessions_unique" },
		{ table: "VariantExtensionProduct", name: "VariantExtensionProduct_unique" },
	];
};

DEFINE FUNCTION OVERWRITE fn::refreshSchemaIndexes() {
	let $indexes = fn::schemaIndexRegistry();
	let $indexes = if type::is_array($indexes) { $indexes } else { [] };

	UPSERT app:indexes CONTENT {
		updatedAt: time::now(),
		indexes: $indexes
	};

	REBUILD INDEX IF EXISTS ExamAttempts_unique ON TABLE ExamAttempts;
	REBUILD INDEX IF EXISTS ExamBuilderPage_unique ON TABLE ExamBuilderPage;
	REBUILD INDEX IF EXISTS ExamQuestions_unique ON TABLE ExamQuestions;
	REBUILD INDEX IF EXISTS ExamSessions_unique ON TABLE ExamSessions;
	REBUILD INDEX IF EXISTS ExtensionVariant_unique ON TABLE ExtensionVariant;
	REBUILD INDEX IF EXISTS ExtensionVariants_unique ON TABLE ExtensionVariants;
	REBUILD INDEX IF EXISTS FAQFaqCategorys_unique ON TABLE FAQFaqCategorys;
	REBUILD INDEX IF EXISTS FAQFaqCategoryTerms_unique ON TABLE FAQFaqCategoryTerms;
	REBUILD INDEX IF EXISTS InstanceKey ON TABLE instance;
	REBUILD INDEX IF EXISTS Instances_unique ON TABLE Instances;
	REBUILD INDEX IF EXISTS InstanceSettings_unique ON TABLE InstanceSettings;
	REBUILD INDEX IF EXISTS OrderEvent_unique ON TABLE OrderEvent;
	REBUILD INDEX IF EXISTS OrderExtensionProduct_unique ON TABLE OrderExtensionProduct;
	REBUILD INDEX IF EXISTS OrderExtensionVariant_unique ON TABLE OrderExtensionVariant;
	REBUILD INDEX IF EXISTS OrderItem_unique ON TABLE OrderItem;
	REBUILD INDEX IF EXISTS OrderProduct_unique ON TABLE OrderProduct;
	REBUILD INDEX IF EXISTS OrderProductVariant_unique ON TABLE OrderProductVariant;
	REBUILD INDEX IF EXISTS OrderTrialProduct_unique ON TABLE OrderTrialProduct;
	REBUILD INDEX IF EXISTS OrganisationUsers_unique ON TABLE OrganisationUsers;
	REBUILD INDEX IF EXISTS Post_unique ON TABLE Post;
	REBUILD INDEX IF EXISTS ProductExams_unique ON TABLE ProductExams;
	REBUILD INDEX IF EXISTS ProductOrders_unique ON TABLE ProductOrders;
	REBUILD INDEX IF EXISTS ProductVariant_unique ON TABLE ProductVariant;
	REBUILD INDEX IF EXISTS ProductVariants_unique ON TABLE ProductVariants;
	REBUILD INDEX IF EXISTS QuestionAttempts_unique ON TABLE QuestionAttempts;
	REBUILD INDEX IF EXISTS QuestionNote_unique ON TABLE QuestionNote;
	REBUILD INDEX IF EXISTS QuestionOption_unique ON TABLE QuestionOption;
	REBUILD INDEX IF EXISTS QuestionOptionRecord_unique ON TABLE QuestionOptionRecord;
	REBUILD INDEX IF EXISTS QuestionPerformanceRecord_unique ON TABLE QuestionPerformanceRecord;
	REBUILD INDEX IF EXISTS QuestionQcats_unique ON TABLE QuestionQcats;
	REBUILD INDEX IF EXISTS QuestionQcatTerms_unique ON TABLE QuestionQcatTerms;
	REBUILD INDEX IF EXISTS QuestionQtags_unique ON TABLE QuestionQtags;
	REBUILD INDEX IF EXISTS QuestionQtagTerms_unique ON TABLE QuestionQtagTerms;
	REBUILD INDEX IF EXISTS QuestionQtopics_unique ON TABLE QuestionQtopics;
	REBUILD INDEX IF EXISTS QuestionQtopicTerms_unique ON TABLE QuestionQtopicTerms;
	REBUILD INDEX IF EXISTS SessionAttempts_unique ON TABLE SessionAttempts;
	REBUILD INDEX IF EXISTS SessionCategories_unique ON TABLE SessionCategories;
	REBUILD INDEX IF EXISTS SessionCategoryRecord_unique ON TABLE SessionCategoryRecord;
	REBUILD INDEX IF EXISTS SessionCategoryRecords_unique ON TABLE SessionCategoryRecords;
	REBUILD INDEX IF EXISTS SessionEvent_unique ON TABLE SessionEvent;
	REBUILD INDEX IF EXISTS SessionLog_unique ON TABLE SessionLog;
	REBUILD INDEX IF EXISTS SessionPerformanceRecord_unique ON TABLE SessionPerformanceRecord;
	REBUILD INDEX IF EXISTS SessionQuestions_unique ON TABLE SessionQuestions;
	REBUILD INDEX IF EXISTS SessionRecord_unique ON TABLE SessionRecord;
	REBUILD INDEX IF EXISTS UserAttempts_unique ON TABLE UserAttempts;
	REBUILD INDEX IF EXISTS UserQuestionNote_unique ON TABLE UserQuestionNote;
	REBUILD INDEX IF EXISTS UserQuestionOptionRecord_unique ON TABLE UserQuestionOptionRecord;
	REBUILD INDEX IF EXISTS UserQuestionPerformanceRecord_unique ON TABLE UserQuestionPerformanceRecord;
	REBUILD INDEX IF EXISTS UserRoles_unique ON TABLE UserRoles;
	REBUILD INDEX IF EXISTS UserRoleTerms_unique ON TABLE UserRoleTerms;
	REBUILD INDEX IF EXISTS UserSessions_unique ON TABLE UserSessions;
	REBUILD INDEX IF EXISTS VariantExtensionProduct_unique ON TABLE VariantExtensionProduct;

	return $indexes;
};
