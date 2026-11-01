import { IsMongoId } from 'class-validator';

export class IdPublicacionDto {
  @IsMongoId({ message: 'El id de la publicación no es válido' })
  id: string;
}
