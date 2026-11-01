import type pg from 'pg';

export class HealthRepository {
  constructor(private readonly pool: pg.Pool) {}

  async ping(): Promise<void> {
    await this.pool.query('SELECT 1');
  }
}
