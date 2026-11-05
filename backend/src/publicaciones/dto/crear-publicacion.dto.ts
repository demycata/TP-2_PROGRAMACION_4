import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ETIQUETAS } from '../entities/publicacion.entity.js';

export class CrearPublicacionDto {
  @IsString({ message: 'El título debe ser texto' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  titulo: string;

  @IsString({ message: 'El mensaje debe ser texto' })
  @IsNotEmpty({ message: 'El mensaje es obligatorio' })
  mensaje: string;

  @IsOptional()
  @IsIn(ETIQUETAS, { message: 'La etiqueta no es válida' })
  etiqueta?: (typeof ETIQUETAS)[number];
}
