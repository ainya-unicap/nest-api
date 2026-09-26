import 'dotenv/config';
import { prisma } from '../src/prisma'
import fs from 'fs'
import path from 'path'

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

  for (const planta of data.plantas_forrageiras) {
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

  // upsert, nao create: com create cada execucao do seed duplicava os 340
  // templates (foi o que gerou as 680 linhas e quebrou a serie das medicoes).
  const UNIDADES_CATEGORICAS = [
    'vegetativo/elongação/florescimento',
    'vegetativo/florescimento/frutificação',
    'V1/V2/VT/R1/R2/R3',
    'VE/V1/V2/R1/R2/R3/R4',
  ]

  for (const template of data.plant_templates) {
    // "unit" com "/" nao basta para identificar categorico: "perfilhos/m²" e numerico.
    const field_type = UNIDADES_CATEGORICAS.includes(template.unit)
      ? 'CATEGORICO'
      : 'NUMERICO'

    await prisma.plantTemplate.upsert({
      where: {
        plant_id_field_name: {
          plant_id: template.plant_id,
          field_name: template.field_name,
        },
      },
      update: { unit: template.unit, field_type },
      create: {
        plant_id: template.plant_id,
        field_name: template.field_name,
        unit: template.unit,
        field_type,
      },
    })
  }

  console.log('Templates de medições criados/atualizados')

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