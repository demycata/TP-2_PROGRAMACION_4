import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PasswordHasher } from '@nestjs/authentication';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { RegistroDto } from './dto/registro.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { Usuario, UsuarioDocument } from '../usuarios/entities/usuario.entity.js';
import { CloudinaryService } from '../shared/cloudinary/cloudinary.service.js';
import { UsuarioToken } from '../guards/auth/auth.guard.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Usuario.name) private usuarioModel: Model<Usuario>, //inyeccion de dependencias para poder usar el modelo de usuario
    private readonly passwordHasher: PasswordHasher,
    private readonly cloudinaryService: CloudinaryService,
    private readonly jwtService: JwtService,
  ) {}

  async registro(registroDto: RegistroDto, imagen: Express.Multer.File) {
    const existente = await this.usuarioModel.findOne({
      $or: [{ correo: registroDto.correo }, { nombreUsuario: registroDto.nombreUsuario }],
    });

    if (existente) {
      throw new ConflictException(
        existente.correo === registroDto.correo
          ? 'El correo ya está registrado'
          : 'El nombre de usuario ya está en uso',
      );
    }

    const password = await this.passwordHasher.hash(registroDto.password);//encripta la contraseña antes de guardarla en la base de datos
    const imagenPerfil = await this.cloudinaryService.subirImagen(imagen, 'perfiles');

    const usuario = await this.usuarioModel.create({ ...registroDto, password, imagenPerfil });

    return this.respuestaConToken(usuario);
  }

  async login(loginDto: LoginDto) {
    const usuario = await this.usuarioModel
      .findOne({ nombreUsuario: loginDto.nombreUsuario })
      .select('+password');

    if (!usuario || !(await this.passwordHasher.verify(loginDto.password, usuario.password))) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    return this.respuestaConToken(usuario);
  }

  private async respuestaConToken(usuario: UsuarioDocument) {
    const token = await this.generarToken(usuario);
    return { token, usuario: this.sinPassword(usuario) };
  }

  private generarToken(usuario: UsuarioDocument) {
    const payload: UsuarioToken = {
      sub: usuario._id.toString(),
      nombreUsuario: usuario.nombreUsuario,
      perfil: usuario.perfil,
    };
    return this.jwtService.signAsync(payload);
  }


  //funcion auxiliar para eliminar la contraseña del objeto usuario antes de devolverlo al cliente
  private sinPassword(usuario: UsuarioDocument) {
    const { password: _, ...datos } = usuario.toObject(); //Excluye la contraseña del objeto devuelto . To object() convierte en json para devolver en la promise
    return datos;
  }
}
