import { Surreal } from 'surrealdb';
import type { AppDatabaseConfig } from '../types';

export async function connectSurreal(config: AppDatabaseConfig): Promise<Surreal> {
  const client = new Surreal();
  const url = config.url.endsWith('/rpc') ? config.url : `${config.url}/rpc`;

  await client.connect(url);
  await client.signin({ username: config.username, password: config.password });
  await client.use({ namespace: config.namespace, database: config.database });

  return client;
}
