import { Client } from 'pg';

export default async () => {
  const client = new Client({
    user: 'postgres',
    password: '1234',
    host: 'localhost',
    port: '5432',
    database: 'exam',
  });

  await client.connect();
  return client;
};
