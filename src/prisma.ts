import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Sem timeouts explícitos o pool espera para sempre: se o banco estiver fora do
// ar (ou suspenso, como o Neon costuma ficar), as requisições penduram em vez de
// falhar, os retries consomem o pool e a API inteira trava até reiniciar.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  // tempo máximo para conseguir uma conexão do pool
  connectionTimeoutMillis: 10_000,
  // derruba conexões ociosas antes que o pooler do Neon as feche por baixo
  idleTimeoutMillis: 30_000,
  // teto por query no lado do servidor, para nenhuma requisição ficar presa
  statement_timeout: 20_000,
  query_timeout: 20_000,
})

export const prisma = new PrismaClient({ adapter })

// Fecha o pool no encerramento — importante em serverless, onde cada cold start
// abriria uma conexão nova sem nunca devolver a anterior.
export async function disconnectPrisma() {
  await prisma.$disconnect()
}
