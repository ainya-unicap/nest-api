// Extensão global do Request do Express com o user populado pelo JwtAuthGuard.
// Com isso qualquer controller pode acessar req.user sem cast.

export {};

declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}
