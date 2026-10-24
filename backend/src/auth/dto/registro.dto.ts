import { IsDateString, IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class RegistroDto {
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre: string;

  @IsString({ message: 'El apellido debe ser texto' })
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  apellido: string;

  @IsEmail({}, { message: 'El correo no es válido' })
  correo: string;

  @IsString({ message: 'El nombre de usuario debe ser texto' })
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio' })
  nombreUsuario: string;

  @Matches(/^(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message: 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número',
  })
  password: string;

  @IsDateString({}, { message: 'La fecha de nacimiento no es válida' })
  fechaNacimiento: string;

  @IsString({ message: 'La descripción debe ser texto' })
  @MinLength(5, { message: 'La descripción debe tener al menos 5 caracteres' })
  descripcion: string;
}
