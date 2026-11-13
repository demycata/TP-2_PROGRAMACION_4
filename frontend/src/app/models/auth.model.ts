import { Usuario } from './usuario.model';

export interface DatosLogin {
  nombreUsuario: string;
  password: string;
}

export interface RespuestaAuth {
  token: string;
  usuario: Usuario;
}

export type TokenRenovado = Pick<RespuestaAuth, 'token'>;
