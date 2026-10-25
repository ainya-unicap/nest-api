import 'dotenv/config';
import { prisma } from '../src/prisma'
import fs from 'fs'
import path from 'path'

// Catálogo reduzido para 15 espécies (decisão do time), escolhidas pra cobrir
// as categorias principais e a relevância regional (semiárido/NE, com peso em
// palma forrageira). O JSON de origem tem 60 — as demais ficam de fora daqui
// em vez de editar o arquivo histórico.
const PLANTAS_MANTIDAS = [
  'pf-041', // Capim Mombaça
  'pf-040', // Capim Tanzânia
  'pf-030', // BRS Piatã
  'pf-051', // Brachiaria decumbens
  'pf-024', // Brachiaria ruziziensis
  'pf-016', // Tifton
  'pf-042', // Capim-elefante cv. Mott
  'pf-034', // BRS Capiaçu
  'pf-001', // Gliricídia
  'pf-002', // Leucena
  'pf-018', // Guandu
  'pf-005', // Palma Gigante
  'pf-006', // Palma Miúda
  'pf-039', // Milheto
  'pf-027', // Cana-de-açúcar
]

async function main() {
  const filePath = path.resolve('prisma/seed_plantas_forrageiras_atualizado.json')

  const file = fs.readFileSync(filePath, 'utf-8')
  const data = JSON.parse(file)

  const institution = data.institution

  await prisma.institution.upsert({
    where: {
      id: institution.id,
    },
    update: {
      name: institution.name,
    },
    create: {
      id: institution.id,
      name: institution.name,
    },
  })

  console.log('Instituição criada/atualizada')

  if (Array.isArray(data.academic_periods)) {
    for (const periodo of data.academic_periods) {
      await prisma.academicPeriod.upsert({
        where: { id: periodo.id },
        update: {
          name: periodo.name,
          semester: periodo.semester,
          start_date: new Date(periodo.start_date),
          end_date: new Date(periodo.end_date),
        },
        create: {
          id: periodo.id,
          name: periodo.name,
          semester: periodo.semester,
          start_date: new Date(periodo.start_date),
          end_date: new Date(periodo.end_date),
        },
      })
    }
    console.log('Períodos letivos criados/atualizados')
  }

  const plantasFiltradas = data.plantas_forrageiras.filter((p: { id: string }) =>
    PLANTAS_MANTIDAS.includes(p.id),
  )

  for (const planta of plantasFiltradas) {
    await prisma.plantaForrageira.upsert({
      where: {
        id: planta.id,
      },
      update: {
        name: planta.name,
        category: planta.category,
        description: planta.description,
        semester_focus: planta.semester_focus,
      },
      create: {
        id: planta.id,
        name: planta.name,
        category: planta.category,
        description: planta.description,
        semester_focus: planta.semester_focus,
      },
    })
  }

  console.log('Plantas forrageiras criadas/atualizadas')

  // plant_templates do JSON não é mais usado: o formulário agora tem campos
  // fixos (altura, estado fenológico, clima, checklist), iguais para
  // qualquer planta — não depende mais de um molde configurável por espécie.

  console.log('Seed finalizado com sucesso')
}

main()
  .catch((error) => {
    console.error('Erro ao executar seed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })