import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANIO_MAXIMO = 2 * 1024 * 1024;

export function imagenValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const archivo = control.value as File | null;
    if (!archivo) {
      return null;
    }
    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      return { tipoImagen: true };
    }
    if (archivo.size > TAMANIO_MAXIMO) {
      return { tamanioImagen: true };
    }
    return null;
  };
}
