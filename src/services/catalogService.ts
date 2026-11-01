import type { SalonServiceRepository } from '../data/salonServiceRepository.js';
import type { SalonService } from '../models/salonService.js';

export class CatalogService {
  constructor(private readonly salonServices: Pick<SalonServiceRepository, 'list'>) {}

  listServices(): Promise<SalonService[]> {
    return this.salonServices.list();
  }
}
