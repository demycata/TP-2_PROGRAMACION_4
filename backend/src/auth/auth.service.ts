import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PasswordHasher } from '@nestjs/authentication';
import { Model } from 'mongoose';
import { RegistroDto } from './dto/registro.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { Usuario, UsuarioDocument } from '../usuarios/entities/usuario.entity.js';
import { CloudinaryService } from '../shared/cloudinary/cloudinary.service.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Usuario.name) private usuarioModel: Model<Usuario>,
    private readonly passwordHasher: PasswordHasher,
    private readonly cloudinaryService: CloudinaryService,
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

    const password = await this.passwordHasher.hash(registroDto.password);
    const imagenPerfil = await this.cloudinaryService.subirImagen(imagen, 'perfiles');

    const usuario = await this.usuarioModel.create({ ...registroDto, password, imagenPerfil });

    return this.sinPassword(usuario);
  }

  async login(loginDto: LoginDto) {
    const usuario = await this.usuarioModel
      .findOne({ nombreUsuario: loginDto.nombreUsuario })
      .select('+password');

    if (!usuario || !(await this.passwordHasher.verify(loginDto.password, usuario.password))) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    return this.sinPassword(usuario);
  }

  private sinPassword(usuario: UsuarioDocument) {
    const { password: _, ...datos } = usuario.toObject(); //Excluye la contraseña del objeto devuelto . To object() convierte en json para devolver en la promise
    return datos;
  }
}
