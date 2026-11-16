import { IsMongoId } from 'class-validator';

export class IdUsuarioDto {
  @IsMongoId({ message: 'El id del usuario no es válido' })
  id: string;
}
