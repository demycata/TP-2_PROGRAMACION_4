import { HttpErrorResponse } from '@angular/common/http';


//FUNCION AUXILIAR PARA DEVOLVER UN MENSAJE APARTIR DE UNA PETICION HTTP QUE DEVUELVE UN ERROR. 
// SI EL ERROR ES DESCONOCIDO DEVUELVE UN MENSAJE GENERICO

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
