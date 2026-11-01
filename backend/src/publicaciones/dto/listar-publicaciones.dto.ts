import { Type } from 'class-transformer';
import { IsIn, IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';

export class ListarPublicacionesDto {
  @IsOptional()
  @IsIn(['fecha', 'meGusta'], { message: 'El orden debe ser "fecha" o "meGusta"' })
  orden: 'fecha' | 'meGusta' = 'fecha';


  // Validación para filtrar por usuario, se usa en el perfil
  @IsOptional()
  @IsMongoId({ message: 'El usuario no es válido' })
  usuario?: string;


  // Validaciones para paginación
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El offset debe ser un número entero' })
  @Min(0, { message: 'El offset no puede ser negativo' })
  offset: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El limit debe ser un número entero' })
  @Min(1, { message: 'El limit debe ser al menos 1' })
  @Max(50, { message: 'El limit no puede ser mayor a 50' })
  limit: number = 10;
}
