// AUTO-GENERATED — database credentials
export type DbInstanceConfig = {
  url: string;
  namespace: string;
  database: string;
  username: string;
  password: string;
  active: boolean;
  allowScripting?: boolean;
};

export const dbInstances = {
  "local": {
    "url": "http://127.0.0.1:2993",
    "namespace": "raven",
    "database": "raven1",
    "username": "mpire",
    "password": "BurntMyMoustacheIn1986",
    "active": true,
    "allowScripting": true
  }
} as const;

export type DbInstanceKey = keyof typeof dbInstances;

export const instancesEnabled = false as const;

export const sourceDbInstance: DbInstanceKey = "local" as DbInstanceKey;
export const tenantDbInstances: DbInstanceKey[] = [] as DbInstanceKey[];
export const instanceTopology = {
  enabled: instancesEnabled,
  source: sourceDbInstance,
  tenants: tenantDbInstances,
} as const;

export const defaultDbInstance: DbInstanceKey = sourceDbInstance as DbInstanceKey;
