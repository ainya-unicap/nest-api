import { Injectable } from '@nestjs/common';
import { CanteiroRepository } from '../repositories/canteiro.repository';

@Injectable()
export class CanteiroService {
  private repo = new CanteiroRepository();

  findByUser(userId: string) {
    return this.repo.findByUser(userId);
  }

  create(body: any) {
    return this.repo.create(body);
  }

  findListasByCanteiro(id: string) {
    return this.repo.findListasByCanteiro(id);
  }
}
