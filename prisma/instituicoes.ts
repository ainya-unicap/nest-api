/**
 * Instituições de Pernambuco ligadas ao tema do app (ensino e pesquisa em
 * agronomia, zootecnia e forragicultura).
 *
 * Fonte única da verdade para o seed. A migration
 * `20261101120000_instituicoes_pernambuco` carregou esta mesma lista no banco;
 * ao mexer aqui, crie uma migration nova — migration aplicada não se edita.
 *
 * Os ids são fixos e legíveis de propósito: o seed usa upsert por id, então
 * rodar de novo atualiza em vez de duplicar.
 */
export interface InstituicaoSeed {
  id: string;
  name: string;
  abbreviation: string;
}

export const INSTITUICOES_PE: InstituicaoSeed[] = [
  {
    id: 'inst-ufrpe',
    name: 'Universidade Federal Rural de Pernambuco',
    abbreviation: 'UFRPE',
  },
  {
    id: 'inst-ufape',
    name: 'Universidade Federal do Agreste de Pernambuco',
    abbreviation: 'UFAPE',
  },
  {
    id: 'inst-univasf',
    name: 'Universidade Federal do Vale do São Francisco',
    abbreviation: 'UNIVASF',
  },
  {
    id: 'inst-ifpe',
    name: 'Instituto Federal de Pernambuco',
    abbreviation: 'IFPE',
  },
  {
    id: 'inst-if-sertao',
    name: 'Instituto Federal do Sertão Pernambucano',
    abbreviation: 'IF Sertão-PE',
  },
  {
    id: 'inst-codai',
    name: 'Colégio Agrícola Dom Agostinho Ikas (UFRPE)',
    abbreviation: 'CODAI',
  },
  {
    id: 'inst-ipa',
    name: 'Instituto Agronômico de Pernambuco',
    abbreviation: 'IPA',
  },
  {
    id: 'inst-embrapa-semiarido',
    name: 'Empresa Brasileira de Pesquisa Agropecuária — Embrapa Semiárido',
    abbreviation: 'Embrapa Semiárido',
  },
  {
    id: 'inst-upe',
    name: 'Universidade de Pernambuco',
    abbreviation: 'UPE',
  },
  {
    id: 'inst-unicap',
    name: 'Universidade Católica de Pernambuco',
    abbreviation: 'UNICAP',
  },
];
