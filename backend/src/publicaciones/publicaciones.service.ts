import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto.js';
import { ListarPublicacionesDto } from './dto/listar-publicaciones.dto.js';
import { Publicacion } from './entities/publicacion.entity.js';
import { CloudinaryService } from '../shared/cloudinary/cloudinary.service.js';
import { UsuarioToken } from '../guards/auth/auth.guard.js';

@Injectable()
export class PublicacionesService {
  constructor(
    @InjectModel(Publicacion.name) private publicacionModel: Model<Publicacion>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async crear(crearPublicacionDto: CrearPublicacionDto, autor: string, imagen?: Express.Multer.File) {
    const urlImagen = imagen
      ? await this.cloudinaryService.subirImagen(imagen, 'publicaciones')
      : undefined;

    const publicacion = await this.publicacionModel.create({
      ...crearPublicacionDto,
      imagen: urlImagen,
      autor,
    });

    //se devuelve con la misma forma que el listado; recién creada no tiene me gusta
    const creada = await this.publicacionModel
      .findById(publicacion._id, '-meGusta -eliminada -__v')
      .populate('autor', 'nombre apellido nombreUsuario imagenPerfil') //agregar los datos del autor
      .lean(); //lean para que devuelva un objeto plano y no un documento de Mongoose, así se puede agregar la propiedad cantidadMeGusta y meGustaDado
    return { ...creada, cantidadMeGusta: 0, meGustaDado: false };
  }

  async listar({ orden, usuario, offset, limit }: ListarPublicacionesDto, usuarioActual: string) {
    const filtro = {
      eliminada: false,
      ...(usuario ? { autor: new Types.ObjectId(usuario) } : {}),
    };
    const ordenamiento: Record<string, 1 | -1> =
      orden === 'meGusta'
        ? { cantidadMeGusta: -1, createdAt: -1, _id: -1 }
        : { createdAt: -1, _id: -1 };

    // aggregate porque para ordenar por me gusta hace falta la cantidad, que no está guardada
    const [publicaciones, total] = await Promise.all([
      this.publicacionModel.aggregate([
        { $match: filtro },
        {
          $addFields: {
            cantidadMeGusta: { $size: { $ifNull: ['$meGusta', []] } },
            meGustaDado: {
              $in: [new Types.ObjectId(usuarioActual), { $ifNull: ['$meGusta.usuario', []] }], //chequear si el usuario actual está en la lista de me gusta; si no hay me gusta, devolver false
            },
          },
        },
        { $project: { meGusta: 0, eliminada: 0, __v: 0 } }, //quitar campos que no se necesitan
        { $sort: ordenamiento },
        { $skip: offset },
        { $limit: limit },
      ]),
      this.publicacionModel.countDocuments(filtro),//total de publicaciones que cumplen el filtro, para paginación
    ]);

    return {
      publicaciones: await this.publicacionModel.populate(publicaciones, {//populate para traer los datos del autor
        path: 'autor',
        select: 'nombre apellido nombreUsuario imagenPerfil',
      }),
      total,
    };
  }

  // el filtro y el $push van en la misma operación, así dos pedidos simultáneos no pueden sumar dos me gusta del mismo usuario
  async darMeGusta(id: string, usuario: string) {
    const publicacion = await this.publicacionModel.findOneAndUpdate(
      { _id: id, eliminada: false, 'meGusta.usuario': { $ne: usuario } },
      { $push: { meGusta: { usuario, fecha: new Date() } } },
      { returnDocument: 'after' },
    );

    if (!publicacion) {
      if (!(await this.publicacionModel.exists({ _id: id, eliminada: false }))) {
        throw new NotFoundException('La publicación no existe');
      }
      throw new ConflictException('Ya le diste me gusta a esta publicación');
    }

    return { cantidadMeGusta: publicacion.meGusta.length, meGustaDado: true };
  }

  async quitarMeGusta(id: string, usuario: string) {
    const publicacion = await this.publicacionModel.findOneAndUpdate(
      { _id: id, eliminada: false, 'meGusta.usuario': usuario },
      { $pull: { meGusta: { usuario } } },
      { returnDocument: 'after' },
    );

    if (!publicacion) {
      if (!(await this.publicacionModel.exists({ _id: id, eliminada: false }))) {
        throw new NotFoundException('La publicación no existe');
      }
      throw new NotFoundException('No le habías dado me gusta a esta publicación');
    }

    return { cantidadMeGusta: publicacion.meGusta.length, meGustaDado: false };
  }

  async eliminar(id: string, usuario: UsuarioToken) {
    const publicacion = await this.publicacionModel.findOne({ _id: id, eliminada: false });
    if (!publicacion) {
      throw new NotFoundException('La publicación no existe');
    }

    if (publicacion.autor.toString() !== usuario.sub && usuario.perfil !== 'administrador') {
      throw new ForbiddenException('Solo el autor o un administrador puede eliminar esta publicación');
    }

    publicacion.eliminada = true;
    await publicacion.save();
  }
}
