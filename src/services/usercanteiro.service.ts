import { Injectable } from '@nestjs/common';
import { UserCanteiroRepository } from '../repositories/usercanteiro.repository';

@Injectable()
export class UserCanteiroService {
  private repo = new UserCanteiroRepository();

  create(body: any) {
    return this.repo.create(body);
  }

  findByUser(user_id: string) {
    return this.repo.findByUser(user_id);
  }

  findByCanteiro(canteiro_id: string) {
    return this.repo.findByCanteiro(canteiro_id);
  }

  delete(body: any) {
    return this.repo.delete(body);
  }

  exists(user_id: string, canteiro_id: string) {
    return this.repo.exists(user_id, canteiro_id);
  }
}
