import pg from 'pg';

export function createPool(databaseUrl: string): pg.Pool {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 10,
    connectionTimeoutMillis: 3000,
    query_timeout: 5000,
  });

  // Without a listener, an idle connection dropping would crash the whole process.
  pool.on('error', (error) => {
    console.error('Idle database connection error:', error.message);
  });

  return pool;
}
