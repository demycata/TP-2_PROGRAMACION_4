import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CrearComentarioDto {
  @IsString({ message: 'El mensaje debe ser texto' })
  @IsNotEmpty({ message: 'El mensaje es obligatorio' })
  @MaxLength(1000, { message: 'El comentario no puede superar los 1000 caracteres' })
  mensaje: string;
}
