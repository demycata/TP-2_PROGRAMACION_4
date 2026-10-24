import { HttpErrorResponse } from '@angular/common/http';

export function mensajeDeError(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'No se pudo conectar con el servidor. Probá de nuevo en un rato.';
  }
  const mensaje = error.error?.message;
  if (Array.isArray(mensaje)) {
    return mensaje.join('. ');
  }
  return mensaje ?? 'Ocurrió un error inesperado.';
}
