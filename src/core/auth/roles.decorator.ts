import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Marca uma rota como exclusiva de um (ou mais) roles. O RolesGuard confere
// o role de verdade no banco — o token (via JwtAuthGuard) só garante o id.
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
