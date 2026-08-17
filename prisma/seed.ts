import { prisma } from '../lib/prisma.js'
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

  for (const template of data.plant_templates) {
    await prisma.plantTemplate.create({
      data: {
        plant_id: template.plant_id,
        field_name: template.field_name,
        unit: template.unit,
      },
    })
  }

  console.log('Templates de medições criados')

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