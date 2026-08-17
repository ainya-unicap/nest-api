import { Injectable } from '@nestjs/common';
import { ListaDeFormulariosRepository } from '../repositories/listadeformularios.repository';

@Injectable()
export class ListaDeFormulariosService {
  private repo = new ListaDeFormulariosRepository();

  create(body: any) {
    return this.repo.create(body);
  }

  findById(id: string) {
    return this.repo.findById(id);
  }

  findByCanteiro(canteiroId: string) {
    return this.repo.findByCanteiro(canteiroId);
  }

  findFormularios(listaId: string) {
    return this.repo.findFormularios(listaId);
  }
}
