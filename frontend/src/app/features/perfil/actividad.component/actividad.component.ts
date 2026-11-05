import { Component, computed, signal } from '@angular/core';
import { formatDate } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { PublicacionService } from '../../../services/publicacion.service';
import { ActividadDia, CeldaActividad } from '../../../models/publicacion.model';
import { mensajeDeError } from '../../../shared/mensaje-error';

const DIAS = 26 * 7;

@Component({
  selector: 'app-actividad',
  templateUrl: './actividad.component.html',
  styleUrl: './actividad.component.css',
})
export class ActividadComponent {
  private dias = signal<ActividadDia[]>([]);
  error = signal<string | null>(null);

  celdas = computed<CeldaActividad[]>(() => {
    const porFecha = new Map(this.dias().map((dia) => [dia.fecha, dia.cantidad]));
    const hoy = new Date();

    return Array.from({ length: DIAS }, (_, i) => {
      const dia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (DIAS - 1 - i));
      const fecha = formatDate(dia, 'yyyy-MM-dd', 'en-US');
      const cantidad = porFecha.get(fecha) ?? 0;
      return { fecha, cantidad, nivel: cantidad >= 5 ? 4 : cantidad >= 3 ? 3 : cantidad };
    });
  });

  total = computed(() => this.celdas().reduce((suma, celda) => suma + celda.cantidad, 0));

  constructor(publicacionService: PublicacionService) {
    publicacionService.actividad().subscribe({
      next: (dias) => this.dias.set(dias),
      error: (error: HttpErrorResponse) => this.error.set(mensajeDeError(error)),
    });
  }
}
