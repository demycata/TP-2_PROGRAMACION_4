import { IsISO8601, Matches } from 'class-validator';

// IsISO8601 estricto rechaza fechas que no existen (2026-02-30); Matches obliga a mandar solo el día, sin hora
export class LapsoDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha "desde" debe tener el formato AAAA-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'La fecha "desde" no es válida' })
  desde: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha "hasta" debe tener el formato AAAA-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'La fecha "hasta" no es válida' })
  hasta: string;
}
