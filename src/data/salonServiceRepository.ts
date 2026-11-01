import type pg from 'pg';
import type { SalonService } from '../models/salonService.js';

interface SalonServiceRow {
  id: number;
  name: string;
  description: string;
  price_cents: number;
}

function toSalonService(row: SalonServiceRow): SalonService {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
  };
}

export class SalonServiceRepository {
  constructor(private readonly pool: pg.Pool) {}

  async list(): Promise<SalonService[]> {
    const { rows } = await this.pool.query<SalonServiceRow>(
      'SELECT id, name, description, price_cents FROM salon_services ORDER BY price_cents, id',
    );
    return rows.map(toSalonService);
  }

  async findById(id: number): Promise<SalonService | null> {
    const { rows } = await this.pool.query<SalonServiceRow>(
      'SELECT id, name, description, price_cents FROM salon_services WHERE id = $1',
      [id],
    );
    return rows[0] ? toSalonService(rows[0]) : null;
  }
}
