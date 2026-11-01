import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';

export type PublicacionDocument = HydratedDocument<Publicacion>;

// sin collection, Mongoose pluraliza en inglés y la llama "publicacions"
@Schema({ timestamps: true, collection: 'publicaciones' })
export class Publicacion {
  @Prop({ required: true })
  titulo: string;

  @Prop({ required: true })
  mensaje: string;

  @Prop()
  imagen?: string;

  // Schema.Types.ObjectId es el tipo para el schema; con Types.ObjectId (la clase del valor) se guarda como string
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true })
  autor: Types.ObjectId; //hace referencia al _id del usuario que creó la publicación

  @Prop({
    type: [
      {
        _id: false,
        usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
        fecha: Date,
      },
    ],
    default: [],
  })
  meGusta: { usuario: Types.ObjectId; fecha: Date }[];

  @Prop({ default: false })
  eliminada: boolean;
}

export const PublicacionSchema = SchemaFactory.createForClass(Publicacion);
