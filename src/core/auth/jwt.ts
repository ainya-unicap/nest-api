// Fonte única do segredo de assinatura dos JWTs.
// Sem fallback silencioso: um "dev-secret" hardcoded em produção significa
// que qualquer um consegue forjar um accessToken válido.
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      'JWT_SECRET não configurado. Defina a variável de ambiente (veja .env.example).',
    );
  }

  return secret;
}
