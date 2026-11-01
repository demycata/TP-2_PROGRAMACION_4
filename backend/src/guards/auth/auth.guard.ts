import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface UsuarioToken {
  sub: string;
  nombreUsuario: string;
  perfil: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: UsuarioToken }>(); //traer el request y agregarle la propiedad user que es opcional y de tipo UsuarioToken
    const token = this.extraerToken(request);

    if (!token) {
      throw new UnauthorizedException('Falta el token de acceso');
    }

    try {
      request.user = this.jwtService.verify<UsuarioToken>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o vencido');
    }
  }


  //función auxiliar para extraer el token del header de autorización
  private extraerToken(request: Request): string | null {
    const [tipo, token] = request.headers.authorization?.split(' ') ?? [];
    return tipo === 'Bearer' && token ? token : null;
  }
}
