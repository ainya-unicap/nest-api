/**
 * Seed de DEMONSTRAÇÃO — cria um acompanhamento completo e realista de uma
 * lista, para desenvolver e demonstrar o resumo por IA.
 *
 *   npx tsx prisma/seed-demo.ts
 *
 * É idempotente: usa ids fixos com upsert, então pode rodar quantas vezes quiser
 * sem duplicar nada. Tudo que ele cria começa com "demo-", o que torna trivial
 * localizar (ou remover) depois.
 *
 * A série conta uma história de propósito — crescimento, ataque de formigas,
 * estiagem, corte de uniformização na semana 9 e rebrota — para que o resumo
 * gerado tenha o que narrar além de "a planta cresceu".
 */
import 'dotenv/config';
import argon2 from 'argon2';
import { prisma } from '../src/prisma';

// Conta dedicada à demonstração: as seeds não ficam penduradas na conta de
// ninguém real. Credenciais de desenvolvimento — não reaproveitar em produção.
const DEMO_EMAIL = process.env.DEMO_EMAIL ?? 'demo@donkeycode.com';
const DEMO_SENHA = process.env.DEMO_SENHA ?? 'Demo@2026';
const DEMO_NOME = 'Aluno Demonstração';
const PLANTA = 'BRS Piatã';
const SEMANAS = 12;
const INICIO = new Date('2026-03-14T08:00:00.000Z');

// Uma entrada por semana. O índice do array é a semana.
const SERIES: Record<string, number[]> = {
  'Altura da planta':                 [8, 14, 21, 29, 38, 46, 52, 55, 20, 27, 33, 38],
  'Cobertura do solo':                [15, 24, 35, 47, 58, 67, 74, 79, 62, 71, 80, 85],
  'Número de perfilhos por touceira': [3, 4, 6, 8, 10, 12, 14, 15, 15, 16, 17, 17],
  'Comprimento do entrenó':           [2.1, 2.4, 2.9, 3.4, 4.0, 4.6, 5.2, 5.6, 3.1, 4.2, 5.1, 5.8],
  'Largura da folha':                 [0.8, 0.9, 1.1, 1.3, 1.5, 1.6, 1.8, 1.9, 1.2, 1.5, 1.7, 1.8],
  // CATEGORICO: o valor é o índice da opção em unit ("vegetativo/elongação/florescimento")
  'Estádio fenológico':               [0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 2, 2],
};

const OBSERVACOES = [
  'Plantio realizado em 14/03. Solo preparado com adubação de fundação (NPK 04-14-08). Espaçamento de 30 cm entre linhas.',
  'Germinação uniforme em toda a parcela. Umidade do solo adequada após chuva de 22 mm no dia 18.',
  'Primeiras folhas completamente expandidas. Observada leve clorose nas folhas basais, possivelmente deficiência de nitrogênio.',
  'Aplicação de ureia em cobertura (30 kg/ha de N). Clorose regredindo. Nenhum sinal de praga.',
  'Ataque inicial de formigas cortadeiras na borda leste do canteiro, com perda de aproximadamente 5% das folhas. Isca formicida aplicada.',
  'Formigas controladas, sem novos focos. Perfilhamento intenso, touceiras bem formadas e fechando as entrelinhas.',
  'Início da elongação dos colmos. Período de estiagem: 9 dias sem chuva, solo ressecado na camada superficial.',
  'Irrigação suplementar realizada 2x na semana. Planta recuperou o turgor e retomou o crescimento.',
  'Corte de uniformização a 20 cm do solo para estimular a rebrota e avaliar a capacidade de rebrote da cultivar.',
  'Rebrota vigorosa a partir das gemas basais. Cobertura do solo se manteve acima de 60% mesmo após o corte.',
  'Início do florescimento em cerca de 30% das touceiras. Coloração verde intenso, sem sintomas de deficiência.',
  'Florescimento pleno. Encerramento do acompanhamento do semestre. Material apresentou boa rebrota e boa cobertura de solo.',
];

const CHECKLIST_SEMANAL = ['Altura da planta', 'Cobertura do solo', 'Estádio fenológico'];

const diaDaSemana = (i: number) => new Date(INICIO.getTime() + i * 7 * 86_400_000);

async function main() {
  // Usa a primeira instituição disponível, se houver.
  const instituicao = await prisma.institution.findFirst({ orderBy: { name: 'asc' } });

  const senhaHash = await argon2.hash(DEMO_SENHA);
  const aluno = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { name: DEMO_NOME, password: senhaHash, institution_id: instituicao?.id ?? null },
    create: {
      id: 'demo-user-ia',
      name: DEMO_NOME,
      email: DEMO_EMAIL,
      password: senhaHash,
      role: 'aluno',
      institution_id: instituicao?.id ?? null,
    },
  });

  const planta = await prisma.plantaForrageira.findFirst({ where: { name: PLANTA } });
  if (!planta) throw new Error(`Planta "${PLANTA}" não encontrada — rode o seed principal antes.`);

  const templates = await prisma.plantTemplate.findMany({ where: { plant_id: planta.id } });
  const porNome = new Map(templates.map((t) => [t.field_name, t]));

  const faltando = Object.keys(SERIES).filter((n) => !porNome.has(n));
  if (faltando.length) throw new Error(`Templates ausentes para ${PLANTA}: ${faltando.join(', ')}`);

  // --- canteiro + vínculo do aluno ---
  const canteiro = await prisma.canteiro.upsert({
    where: { id: 'demo-canteiro-piata' },
    update: { name: 'Canteiro Demonstração — BRS Piatã', plant_id: planta.id },
    create: { id: 'demo-canteiro-piata', name: 'Canteiro Demonstração — BRS Piatã', plant_id: planta.id },
  });

  await prisma.userCanteiro.upsert({
    where: { user_id_canteiro_id: { user_id: aluno.id, canteiro_id: canteiro.id } },
    update: {},
    create: { user_id: aluno.id, canteiro_id: canteiro.id },
  });

  // --- lista de formulários ---
  const lista = await prisma.listaDeFormularios.upsert({
    where: { id: 'demo-lista-piata' },
    update: { name: 'Acompanhamento semanal — BRS Piatã 2026.1', created_by: aluno.id },
    create: {
      id: 'demo-lista-piata',
      name: 'Acompanhamento semanal — BRS Piatã 2026.1',
      canteiro_id: canteiro.id,
      plant_id: planta.id,
      created_by: aluno.id,
    },
  });

  // --- 12 formulários semanais, com medições e checklist ---
  for (let semana = 0; semana < SEMANAS; semana++) {
    const data = diaDaSemana(semana);
    const formId = `demo-form-${String(semana + 1).padStart(2, '0')}`;

    await prisma.formulario.upsert({
      where: { id: formId },
      update: { observations: OBSERVACOES[semana], started_at: data, ended_at: data, user_id: aluno.id },
      create: {
        id: formId,
        list_id: lista.id,
        user_id: aluno.id,
        type: 'SEMANAL',
        started_at: data,
        ended_at: new Date(data.getTime() + 45 * 60_000),
        observations: OBSERVACOES[semana],
        synced: true,
        createdAt: data,
      },
    });

    for (const [campo, valores] of Object.entries(SERIES)) {
      const template = porNome.get(campo)!;
      const id = `${formId}-m-${template.id.slice(0, 8)}`;
      await prisma.measurement.upsert({
        where: { id },
        update: { value: valores[semana] },
        create: { id, form_id: formId, template_id: template.id, value: valores[semana], createdAt: data },
      });
    }

    for (const campo of CHECKLIST_SEMANAL) {
      const template = porNome.get(campo)!;
      const id = `${formId}-c-${template.id.slice(0, 8)}`;
      await prisma.checklist.upsert({
        where: { id },
        update: {},
        // semana 9 foi o corte: nem tudo foi conferido naquele dia
        create: { id, form_id: formId, template_id: template.id, checked: semana !== 8, createdAt: data },
      });
    }
  }

  const totalMed = await prisma.measurement.count({ where: { form: { list_id: lista.id } } });
  const totalChk = await prisma.checklist.count({ where: { form: { list_id: lista.id } } });

  console.log('Seed de demonstração concluído:');
  console.log(`  aluno      : ${aluno.name} <${aluno.email}>  senha: ${DEMO_SENHA}`);
  console.log(`  planta     : ${planta.name} (${planta.category})`);
  console.log(`  canteiro   : ${canteiro.name}`);
  console.log(`  lista      : ${lista.id}`);
  console.log(`  formulários: ${SEMANAS} semanais (${diaDaSemana(0).toISOString().slice(0, 10)} a ${diaDaSemana(SEMANAS - 1).toISOString().slice(0, 10)})`);
  console.log(`  medições   : ${totalMed} | checklists: ${totalChk}`);
}

main()
  .catch((e) => {
    console.error('Erro no seed de demonstração:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
