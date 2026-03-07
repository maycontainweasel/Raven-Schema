DEFINE TABLE OVERWRITE FAQFaqCategoryTerms SCHEMAFULL TYPE RELATION IN tax OUT t_faq_faqcategory;
DEFINE FIELD OVERWRITE in ON TABLE FAQFaqCategoryTerms TYPE record<tax>;
DEFINE FIELD OVERWRITE out ON TABLE FAQFaqCategoryTerms TYPE record<t_faq_faqcategory>;
DEFINE INDEX OVERWRITE FAQFaqCategoryTerms_unique ON TABLE FAQFaqCategoryTerms FIELDS in, out UNIQUE;

DEFINE TABLE OVERWRITE FAQFaqCategorys SCHEMAFULL TYPE RELATION IN faq OUT t_faq_faqcategory;
DEFINE FIELD OVERWRITE in ON TABLE FAQFaqCategorys TYPE record<faq>;
DEFINE FIELD OVERWRITE out ON TABLE FAQFaqCategorys TYPE record<t_faq_faqcategory>;
DEFINE INDEX OVERWRITE FAQFaqCategorys_unique ON TABLE FAQFaqCategorys FIELDS in, out UNIQUE;
