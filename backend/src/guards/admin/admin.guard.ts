import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UsuarioToken } from '../auth/auth.guard.js';

// va después del AuthGuard, que es el que deja el payload del token en req.user
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: UsuarioToken }>();

    if (request.user?.perfil !== 'administrador') {
      throw new ForbiddenException('Solo un administrador puede hacer esto');
    }

    return true;
  }
}
