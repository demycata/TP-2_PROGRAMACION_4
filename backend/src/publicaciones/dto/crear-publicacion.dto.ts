import { IsNotEmpty, IsString } from 'class-validator';

export class CrearPublicacionDto {
  @IsString({ message: 'El título debe ser texto' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  titulo: string;

  @IsString({ message: 'El mensaje debe ser texto' })
  @IsNotEmpty({ message: 'El mensaje es obligatorio' })
  mensaje: string;
}
