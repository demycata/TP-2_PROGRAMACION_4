import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PasswordHasher } from '@nestjs/authentication';
import { Model } from 'mongoose';
import { RegistroDto } from './dto/registro.dto.js';
import { Usuario } from '../usuarios/entities/usuario.entity.js';
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

    const { password: _, ...datos } = usuario.toObject();
    return datos;
  }
}
