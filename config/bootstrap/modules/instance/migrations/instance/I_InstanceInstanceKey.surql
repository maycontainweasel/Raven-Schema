DEFINE INDEX OVERWRITE InstanceKey ON TABLE instance
  FIELDS key
  UNIQUE
  COMMENT "Ensures each instance key is unique";
