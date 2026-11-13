import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comentario } from './entities/comentario.entity.js';
import { Publicacion } from './entities/publicacion.entity.js';
import { CrearComentarioDto } from './dto/crear-comentario.dto.js';
import { ListarComentariosDto } from './dto/listar-comentarios.dto.js';

@Injectable()
export class ComentariosService {
  constructor(
    @InjectModel(Comentario.name) private comentarioModel: Model<Comentario>,
    @InjectModel(Publicacion.name) private publicacionModel: Model<Publicacion>,
  ) {}

  async crear(publicacion: string, { mensaje }: CrearComentarioDto, autor: string) {
    if (!(await this.publicacionModel.exists({ _id: publicacion, eliminada: false }))) {
      throw new NotFoundException('La publicación no existe');
    }

    const comentario = await this.comentarioModel.create({ publicacion, autor, mensaje });

    return this.comentarioModel
      .findById(comentario._id, '-__v')
      .populate('autor', 'nombre apellido nombreUsuario imagenPerfil')
      .lean();
  }

  // si la publicación se eliminó, sus comentarios dejan de estar disponibles con ella
  async listar(publicacion: string, { offset, limit }: ListarComentariosDto) {
    if (!(await this.publicacionModel.exists({ _id: publicacion, eliminada: false }))) {
      throw new NotFoundException('La publicación no existe');
    }

    const [comentarios, total] = await Promise.all([
      this.comentarioModel
        .find({ publicacion }, '-__v')
        .sort({ createdAt: -1, _id: -1 })
        .skip(offset)
        .limit(limit)
        .populate('autor', 'nombre apellido nombreUsuario imagenPerfil')
        .lean(),
      this.comentarioModel.countDocuments({ publicacion }),
    ]);

    return { comentarios, total };
  }

  async editar(publicacion: string, id: string, { mensaje }: CrearComentarioDto, usuario: string) {
    if (!(await this.publicacionModel.exists({ _id: publicacion, eliminada: false }))) {
      throw new NotFoundException('La publicación no existe');
    }

    const comentario = await this.comentarioModel.findOne({ _id: id, publicacion });
    if (!comentario) {
      throw new NotFoundException('El comentario no existe');
    }

    if (comentario.autor.toString() !== usuario) {
      throw new ForbiddenException('Solo el autor puede editar este comentario');
    }

    comentario.mensaje = mensaje;
    comentario.modificado = true;
    await comentario.save();

    return this.comentarioModel
      .findById(comentario._id, '-__v')
      .populate('autor', 'nombre apellido nombreUsuario imagenPerfil')
      .lean();
  }

  async eliminar(publicacion: string, id: string, usuario: string) {
    if (!(await this.publicacionModel.exists({ _id: publicacion, eliminada: false }))) {
      throw new NotFoundException('La publicación no existe');
    }

    const comentario = await this.comentarioModel.findOne({ _id: id, publicacion });
    if (!comentario) {
      throw new NotFoundException('El comentario no existe');
    }

    if (comentario.autor.toString() !== usuario) {
      throw new ForbiddenException('Solo el autor puede eliminar este comentario');
    }

    await comentario.deleteOne();
  }
}
