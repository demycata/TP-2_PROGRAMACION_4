import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LapsoDto } from './dto/lapso.dto.js';
import { Publicacion } from './entities/publicacion.entity.js';
import { Comentario } from './entities/comentario.entity.js';

@Injectable()
export class EstadisticasService {
  constructor(
    @InjectModel(Publicacion.name) private publicacionModel: Model<Publicacion>,
    @InjectModel(Comentario.name) private comentarioModel: Model<Comentario>,
  ) {}

  async publicacionesPorUsuario(lapso: LapsoDto) {
    const { inicio, fin } = this.rango(lapso);

    const porUsuario = await this.publicacionModel.aggregate([
      { $match: { eliminada: false, createdAt: { $gte: inicio, $lt: fin } } },
      { $group: { _id: '$autor', cantidad: { $sum: 1 } } },
      { $sort: { cantidad: -1, _id: 1 } },
      { $project: { _id: 0, usuario: '$_id', cantidad: 1 } },
    ]);

    // usuario no es un campo de Publicacion, por eso hay que decirle a populate qué modelo usar
    return this.publicacionModel.populate(porUsuario, {
      path: 'usuario',
      model: 'Usuario',
      select: 'nombreUsuario imagenPerfil',
    });
  }

  async comentarios(lapso: LapsoDto) {
    const { inicio, fin } = this.rango(lapso);
    const eliminadas = await this.publicacionModel.distinct('_id', { eliminada: true });

    const porDia = await this.comentarioModel.aggregate<{ _id: string; cantidad: number }>([
      { $match: { publicacion: { $nin: eliminadas }, createdAt: { $gte: inicio, $lt: fin } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'America/Argentina/Buenos_Aires' },
          },
          cantidad: { $sum: 1 },
        },
      },
    ]);

    // los días sin comentarios no salen del $group: se completan con 0 para que la línea no saltee días
    const cantidades = new Map(porDia.map(({ _id, cantidad }) => [_id, cantidad]));
    const dias: { fecha: string; cantidad: number }[] = [];
    for (let dia = new Date(`${lapso.desde}T00:00:00Z`); dia <= new Date(`${lapso.hasta}T00:00:00Z`); dia.setUTCDate(dia.getUTCDate() + 1)) {
      const fecha = dia.toISOString().slice(0, 10);
      dias.push({ fecha, cantidad: cantidades.get(fecha) ?? 0 });
    }

    return {
      total: porDia.reduce((total, { cantidad }) => total + cantidad, 0),
      porDia: dias,
    };
  }

  async comentariosPorPublicacion(lapso: LapsoDto) {
    const { inicio, fin } = this.rango(lapso);
    const eliminadas = await this.publicacionModel.distinct('_id', { eliminada: true });

    const porPublicacion = await this.comentarioModel.aggregate([
      { $match: { publicacion: { $nin: eliminadas }, createdAt: { $gte: inicio, $lt: fin } } },
      { $group: { _id: '$publicacion', cantidad: { $sum: 1 } } },
      { $sort: { cantidad: -1, _id: 1 } },
      { $project: { _id: 0, publicacion: '$_id', cantidad: 1 } },
    ]);

    return this.comentarioModel.populate(porPublicacion, { path: 'publicacion', select: 'titulo' });
  }

  // los días van en hora de Argentina (-03:00, sin horario de verano) y "hasta" incluye el día entero
  private rango({ desde, hasta }: LapsoDto) {
    if (desde > hasta) {
      throw new BadRequestException('La fecha "desde" no puede ser posterior a "hasta"');
    }

    const inicio = new Date(`${desde}T00:00:00-03:00`);
    const fin = new Date(`${hasta}T00:00:00-03:00`);
    fin.setUTCDate(fin.getUTCDate() + 1);

    return { inicio, fin };
  }
}
