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
  "mpd": {
    "url": "http://127.0.0.1:7587",
    "namespace": "schema",
    "database": "mpd1",
    "username": "root",
    "password": "root",
    "active": true,
    "root": true,
    "allowScripting": true
  }
} as const;

export type DbInstanceKey = keyof typeof dbInstances;

export const defaultDbInstance: DbInstanceKey = "mpd" as DbInstanceKey;
