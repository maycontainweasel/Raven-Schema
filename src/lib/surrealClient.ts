import { Surreal } from 'surrealdb';
import type { AppDatabaseConfig } from '../types';

export async function connectSurreal(config: AppDatabaseConfig): Promise<Surreal> {
  const client = new Surreal();
  const url = config.url.endsWith('/rpc') ? config.url : `${config.url}/rpc`;

  try {
    if (config.root) {
      await client.connect(url);
      await client.signin({ username: config.username, password: config.password });
      await client.use({ namespace: config.namespace, database: config.database });
    } else {
      await client.connect(url, {
        namespace: config.namespace,
        database: config.database,
        auth: {
          username: config.username,
          password: config.password,
        },
      });
    }
  } catch {
    await client.connect(url);
    await client.signin({ username: config.username, password: config.password });
    await client.use({ namespace: config.namespace, database: config.database });
  }

  return client;
}
