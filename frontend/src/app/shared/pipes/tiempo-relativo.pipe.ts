import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'tiempoRelativo' })
export class TiempoRelativoPipe implements PipeTransform {
  transform(fecha: string | Date): string {
    const minutos = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000);
    if (minutos < 1) {
      return 'recién';
    }
    if (minutos < 60) {
      return `hace ${minutos} min`;
    }
    const horas = Math.floor(minutos / 60);
    if (horas < 24) {
      return `hace ${horas} h`;
    }
    const dias = Math.floor(horas / 24);
    if (dias < 7) {
      return dias === 1 ? 'hace 1 día' : `hace ${dias} días`;
    }
    const semanas = Math.floor(dias / 7);
    if (semanas < 5) {
      return semanas === 1 ? 'hace 1 semana' : `hace ${semanas} semanas`;
    }
    return new Date(fecha).toLocaleDateString('es-AR');
  }
}
