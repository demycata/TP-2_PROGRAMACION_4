import { IsIn } from 'class-validator';
import { RegistroDto } from '../../auth/dto/registro.dto.js';

export class CrearUsuarioDto extends RegistroDto {
  @IsIn(['usuario', 'administrador'], { message: 'El perfil debe ser usuario o administrador' })
  perfil: 'usuario' | 'administrador';
}
