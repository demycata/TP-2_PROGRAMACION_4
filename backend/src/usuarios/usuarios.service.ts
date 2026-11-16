import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PasswordHasher } from '@nestjs/authentication';
import { Model } from 'mongoose';
import { Usuario, UsuarioDocument } from './entities/usuario.entity.js';
import { RegistroDto } from '../auth/dto/registro.dto.js';
import { CrearUsuarioDto } from './dto/crear-usuario.dto.js';
import { CloudinaryService } from '../shared/cloudinary/cloudinary.service.js';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectModel(Usuario.name) private usuarioModel: Model<Usuario>,
    private readonly passwordHasher: PasswordHasher,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // la usan el registro (perfil "usuario" por defecto) y el alta del administrador (perfil elegido)
  async crear(datos: RegistroDto | CrearUsuarioDto, imagen: Express.Multer.File) {
    const existente = await this.usuarioModel.findOne({
      $or: [{ correo: datos.correo }, { nombreUsuario: datos.nombreUsuario }],
    });

    if (existente) {
      throw new ConflictException(
        existente.correo === datos.correo
          ? 'El correo ya está registrado'
          : 'El nombre de usuario ya está en uso',
      );
    }

    const password = await this.passwordHasher.hash(datos.password);
    const imagenPerfil = await this.cloudinaryService.subirImagen(imagen, 'perfiles');

    return this.usuarioModel.create({ ...datos, password, imagenPerfil });
  }

  async alta(crearUsuarioDto: CrearUsuarioDto, imagen: Express.Multer.File) {
    const usuario = await this.crear(crearUsuarioDto, imagen);
    return this.sinPassword(usuario);
  }

  listar() {
    return this.usuarioModel.find().sort({ createdAt: -1 });
  }

  async deshabilitar(id: string, idAdmin: string) {
    if (id === idAdmin) {
      throw new BadRequestException('No podés deshabilitar tu propio usuario');
    }
    return this.cambiarEstado(id, false);
  }

  habilitar(id: string) {
    return this.cambiarEstado(id, true);
  }

  //Excluye la contraseña del objeto devuelto. toObject() lo convierte en un objeto plano
  sinPassword(usuario: UsuarioDocument) {
    const { password: _, ...datos } = usuario.toObject();
    return datos;
  }

  private async cambiarEstado(id: string, habilitado: boolean) {
    const usuario = await this.usuarioModel.findByIdAndUpdate(
      id,
      { habilitado },
      { returnDocument: 'after' },
    );

    if (!usuario) {
      throw new NotFoundException('El usuario no existe');
    }

    return usuario;
  }
}
