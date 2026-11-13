import { IsMongoId } from 'class-validator';

export class IdComentarioDto {
  @IsMongoId({ message: 'El id de la publicación no es válido' })
  id: string;

  @IsMongoId({ message: 'El id del comentario no es válido' })
  comentarioId: string;
}
