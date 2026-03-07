DEFINE TABLE OVERWRITE QuestionQcatTerms SCHEMAFULL TYPE RELATION IN tax OUT t_q_qcat;
DEFINE FIELD OVERWRITE in ON TABLE QuestionQcatTerms TYPE record<tax>;
DEFINE FIELD OVERWRITE out ON TABLE QuestionQcatTerms TYPE record<t_q_qcat>;
DEFINE INDEX OVERWRITE QuestionQcatTerms_unique ON TABLE QuestionQcatTerms FIELDS in, out UNIQUE;

DEFINE TABLE OVERWRITE QuestionQcats SCHEMAFULL TYPE RELATION IN q OUT t_q_qcat;
DEFINE FIELD OVERWRITE in ON TABLE QuestionQcats TYPE record<q>;
DEFINE FIELD OVERWRITE out ON TABLE QuestionQcats TYPE record<t_q_qcat>;
DEFINE INDEX OVERWRITE QuestionQcats_unique ON TABLE QuestionQcats FIELDS in, out UNIQUE;

DEFINE TABLE OVERWRITE QuestionQtagTerms SCHEMAFULL TYPE RELATION IN tax OUT t_q_qtag;
DEFINE FIELD OVERWRITE in ON TABLE QuestionQtagTerms TYPE record<tax>;
DEFINE FIELD OVERWRITE out ON TABLE QuestionQtagTerms TYPE record<t_q_qtag>;
DEFINE INDEX OVERWRITE QuestionQtagTerms_unique ON TABLE QuestionQtagTerms FIELDS in, out UNIQUE;

DEFINE TABLE OVERWRITE QuestionQtags SCHEMAFULL TYPE RELATION IN q OUT t_q_qtag;
DEFINE FIELD OVERWRITE in ON TABLE QuestionQtags TYPE record<q>;
DEFINE FIELD OVERWRITE out ON TABLE QuestionQtags TYPE record<t_q_qtag>;
DEFINE INDEX OVERWRITE QuestionQtags_unique ON TABLE QuestionQtags FIELDS in, out UNIQUE;

DEFINE TABLE OVERWRITE QuestionQtopicTerms SCHEMAFULL TYPE RELATION IN tax OUT t_q_qtopic;
DEFINE FIELD OVERWRITE in ON TABLE QuestionQtopicTerms TYPE record<tax>;
DEFINE FIELD OVERWRITE out ON TABLE QuestionQtopicTerms TYPE record<t_q_qtopic>;
DEFINE INDEX OVERWRITE QuestionQtopicTerms_unique ON TABLE QuestionQtopicTerms FIELDS in, out UNIQUE;

DEFINE TABLE OVERWRITE QuestionQtopics SCHEMAFULL TYPE RELATION IN q OUT t_q_qtopic;
DEFINE FIELD OVERWRITE in ON TABLE QuestionQtopics TYPE record<q>;
DEFINE FIELD OVERWRITE out ON TABLE QuestionQtopics TYPE record<t_q_qtopic>;
DEFINE INDEX OVERWRITE QuestionQtopics_unique ON TABLE QuestionQtopics FIELDS in, out UNIQUE;
