import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PasswordHasher } from '@nestjs/authentication';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { RegistroDto } from './dto/registro.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { Usuario, UsuarioDocument } from '../usuarios/entities/usuario.entity.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { UsuarioToken } from '../guards/auth/auth.guard.js';

const DESHABILITADO = 'Tu usuario está deshabilitado. Contactá a un administrador.';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Usuario.name) private usuarioModel: Model<Usuario>, //inyeccion de dependencias para poder usar el modelo de usuario
    private readonly passwordHasher: PasswordHasher,
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
  ) {}

  async registro(registroDto: RegistroDto, imagen: Express.Multer.File) {
    const usuario = await this.usuariosService.crear(registroDto, imagen);
    return this.respuestaConToken(usuario);
  }

  async login(loginDto: LoginDto) {
    const usuario = await this.usuarioModel
      .findOne({ nombreUsuario: loginDto.nombreUsuario })
      .select('+password');

    if (!usuario || !(await this.passwordHasher.verify(loginDto.password, usuario.password))) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // se chequea después de la contraseña, así no se revela qué usuarios existen
    if (!usuario.habilitado) {
      throw new ForbiddenException(DESHABILITADO);
    }

    return this.respuestaConToken(usuario);
  }

  // 403 y no 401 si está deshabilitado: el token es válido, lo que falla es el permiso
  async autorizar(id: string) {
    const usuario = await this.usuarioModel.findById(id);

    if (!usuario) {
      throw new UnauthorizedException('El usuario ya no existe');
    }
    if (!usuario.habilitado) {
      throw new ForbiddenException(DESHABILITADO);
    }

    return usuario;
  }

  // req.user también trae iat y exp, y firmar un payload que ya tiene exp junto con expiresIn da error
  async refrescar({ sub, nombreUsuario, perfil }: UsuarioToken) {
    await this.autorizar(sub);
    const token = await this.jwtService.signAsync({ sub, nombreUsuario, perfil });
    return { token };
  }

  private async respuestaConToken(usuario: UsuarioDocument) {
    const token = await this.generarToken(usuario);
    return { token, usuario: this.usuariosService.sinPassword(usuario) };
  }

  private generarToken(usuario: UsuarioDocument) {
    const payload: UsuarioToken = {
      sub: usuario._id.toString(),
      nombreUsuario: usuario.nombreUsuario,
      perfil: usuario.perfil,
    };
    return this.jwtService.signAsync(payload);
  }
}
