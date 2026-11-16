import { Component, Signal, computed, signal } from '@angular/core';
import { formatDate } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subscription } from 'rxjs';
import { ChartConfiguration } from 'chart.js';
import { EstadisticaService } from '../../../services/estadistica.service';
import {
  BotonLapso,
  ComentariosEnLapso,
  ComentariosPorPublicacion,
  Grafico,
  Lapso,
  OpcionLapso,
  PublicacionesPorUsuario,
  TarjetaGrafico,
} from '../../../models/estadistica.model';
import { GraficoComponent } from '../../../shared/grafico.component/grafico.component';
import { mensajeDeError } from '../../../shared/mensaje-error';

@Component({
  selector: 'app-estadisticas',
  imports: [GraficoComponent],
  templateUrl: './estadisticas.component.html',
  styleUrl: './estadisticas.component.css',
})
export class EstadisticasComponent {
  tarjetas: TarjetaGrafico[] = [
    { clave: 'comentarios', titulo: 'Comentarios realizados', tipo: 'líneas', unidad: 'comentarios', ancho: true },
    { clave: 'publicaciones', titulo: 'Publicaciones por usuario', tipo: 'barras', unidad: 'publicaciones' },
    { clave: 'porPublicacion', titulo: 'Comentarios por publicación', tipo: 'torta', unidad: 'publicaciones' },
  ];

  opcionesLapso: BotonLapso[] = [
    { valor: 7, texto: '7 días' },
    { valor: 30, texto: '30 días' },
    { valor: 90, texto: '90 días' },
    { valor: 'personalizado', texto: 'Personalizado' },
  ];

  hoy = formatDate(new Date(), 'yyyy-MM-dd', 'en-US');

  // cada gráfico tiene su propio lapso, su carga y su error
  lapsos = signal<Record<Grafico, Lapso>>({
    comentarios: this.ultimosDias(30),
    publicaciones: this.ultimosDias(30),
    porPublicacion: this.ultimosDias(30),
  });
  cargando = signal<Record<Grafico, boolean>>({ comentarios: true, publicaciones: true, porPublicacion: true });
  errores = signal<Record<Grafico, string | null>>({ comentarios: null, publicaciones: null, porPublicacion: null });

  comentarios = signal<ComentariosEnLapso | null>(null);
  publicacionesPorUsuario = signal<PublicacionesPorUsuario[]>([]);
  comentariosPorPublicacion = signal<ComentariosPorPublicacion[]>([]);

  totales = computed<Record<Grafico, number>>(() => ({
    comentarios: this.comentarios()?.total ?? 0,
    publicaciones: this.publicacionesPorUsuario().reduce((total, { cantidad }) => total + cantidad, 0),
    porPublicacion: this.comentariosPorPublicacion().length,
  }));

  // Chart.js dibuja en un canvas y no ve el CSS: los colores salen de las variables de styles.css
  private colores = (() => {
    const estilos = getComputedStyle(document.documentElement);
    const variable = (nombre: string) => estilos.getPropertyValue(nombre).trim();
    return {
      acento: variable('--c-accent'),
      acentoSuave: variable('--c-accent-soft'),
      tarjeta: variable('--c-card'),
      porciones: ['--t-duda', '--t-proyecto', '--t-recurso', '--t-novedad', '--c-str', '--c-num'].map(variable),
      otras: variable('--c-dim'),
    };
  })();

  // un computed por gráfico, así cambiar el lapso de uno no vuelve a dibujar los otros
  configuraciones: Record<Grafico, Signal<ChartConfiguration | null>> = {
    comentarios: computed(() => {
      const datos = this.comentarios();
      if (!datos?.total) {
        return null;
      }
      return {
        type: 'line',
        data: {
          labels: datos.porDia.map(({ fecha }) => formatDate(fecha, 'dd/MM', 'en-US', 'UTC')),
          datasets: [
            {
              label: 'Comentarios',
              data: datos.porDia.map(({ cantidad }) => cantidad),
              borderColor: this.colores.acento,
              backgroundColor: this.colores.acentoSuave,
              pointBackgroundColor: this.colores.acento,
              pointRadius: datos.porDia.length > 45 ? 0 : 3,
              borderWidth: 2,
              cubicInterpolationMode: 'monotone',
              fill: true,
            },
          ],
        },
        options: {
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } },
            y: { beginAtZero: true, ticks: { precision: 0 } },
          },
        },
      };
    }),

    publicaciones: computed(() => {
      const datos = this.publicacionesPorUsuario();
      if (!datos.length) {
        return null;
      }
      return {
        type: 'bar',
        data: {
          labels: datos.map(({ usuario }) => `@${usuario.nombreUsuario}`),
          datasets: [
            {
              label: 'Publicaciones',
              data: datos.map(({ cantidad }) => cantidad),
              backgroundColor: this.colores.acento,
              borderRadius: 4,
              maxBarThickness: 18,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, ticks: { precision: 0 } },
            y: { grid: { display: false }, ticks: { autoSkip: false } },
          },
        },
      };
    }),

    // con muchas publicaciones la torta es ilegible: van las 6 con más comentarios y el resto junto en "Otras"
    porPublicacion: computed(() => {
      const datos = this.comentariosPorPublicacion();
      if (!datos.length) {
        return null;
      }
      const primeras = datos.slice(0, 6);
      const otras = datos.slice(6).reduce((total, { cantidad }) => total + cantidad, 0);
      return {
        type: 'doughnut',
        data: {
          labels: [
            ...primeras.map(({ publicacion }) =>
              publicacion.titulo.length > 30 ? `${publicacion.titulo.slice(0, 29)}…` : publicacion.titulo,
            ),
            ...(otras ? ['Otras'] : []),
          ],
          datasets: [
            {
              label: 'Comentarios',
              data: [...primeras.map(({ cantidad }) => cantidad), ...(otras ? [otras] : [])],
              backgroundColor: [...this.colores.porciones.slice(0, primeras.length), ...(otras ? [this.colores.otras] : [])],
              borderColor: this.colores.tarjeta,
              borderWidth: 2,
            },
          ],
        },
        options: {
          cutout: '60%',
          plugins: { legend: { position: 'right', labels: { boxWidth: 10, boxHeight: 10, padding: 10 } } },
        },
      };
    }),
  };

  // las barras necesitan lugar para el nombre de cada usuario; los otros dos usan el alto de siempre
  altos = computed<Record<Grafico, number>>(() => ({
    comentarios: 280,
    publicaciones: Math.max(280, this.publicacionesPorUsuario().length * 26 + 40),
    porPublicacion: 280,
  }));

  private pedidos: Partial<Record<Grafico, Subscription>> = {};

  constructor(private estadisticaService: EstadisticaService) {
    this.tarjetas.forEach(({ clave }) => this.cargar(clave));
  }

  elegirOpcion(grafico: Grafico, opcion: OpcionLapso) {
    if (opcion === 'personalizado') {
      this.lapsos.update((lapsos) => ({ ...lapsos, [grafico]: { ...lapsos[grafico], opcion } }));
      return;
    }
    this.lapsos.update((lapsos) => ({ ...lapsos, [grafico]: this.ultimosDias(opcion) }));
    this.cargar(grafico);
  }

  cambiarFecha(grafico: Grafico, campo: 'desde' | 'hasta', valor: string) {
    this.lapsos.update((lapsos) => ({ ...lapsos, [grafico]: { ...lapsos[grafico], [campo]: valor } }));
    const { desde, hasta } = this.lapsos()[grafico];
    if (desde && hasta && desde <= hasta) {
      this.cargar(grafico);
    }
  }

  cargar(grafico: Grafico) {
    const lapso = this.lapsos()[grafico];
    switch (grafico) {
      case 'comentarios':
        return this.pedir(grafico, this.estadisticaService.comentarios(lapso), (datos) =>
          this.comentarios.set(datos),
        );
      case 'publicaciones':
        return this.pedir(grafico, this.estadisticaService.publicacionesPorUsuario(lapso), (datos) =>
          this.publicacionesPorUsuario.set(datos),
        );
      case 'porPublicacion':
        return this.pedir(grafico, this.estadisticaService.comentariosPorPublicacion(lapso), (datos) =>
          this.comentariosPorPublicacion.set(datos),
        );
    }
  }

  // si se cambia el lapso antes de que llegue la respuesta anterior, se cancela para que no la pise
  private pedir<T>(grafico: Grafico, pedido: Observable<T>, guardar: (datos: T) => void) {
    this.pedidos[grafico]?.unsubscribe();
    this.cargando.update((cargando) => ({ ...cargando, [grafico]: true }));
    this.errores.update((errores) => ({ ...errores, [grafico]: null }));

    this.pedidos[grafico] = pedido.subscribe({
      next: (datos) => {
        guardar(datos);
        this.cargando.update((cargando) => ({ ...cargando, [grafico]: false }));
      },
      error: (error: HttpErrorResponse) => {
        this.errores.update((errores) => ({ ...errores, [grafico]: mensajeDeError(error) }));
        this.cargando.update((cargando) => ({ ...cargando, [grafico]: false }));
      },
    });
  }

  private ultimosDias(dias: Exclude<OpcionLapso, 'personalizado'>): Lapso {
    const desde = new Date();
    desde.setDate(desde.getDate() - (dias - 1));
    return {
      opcion: dias,
      desde: formatDate(desde, 'yyyy-MM-dd', 'en-US'),
      hasta: formatDate(new Date(), 'yyyy-MM-dd', 'en-US'),
    };
  }
}
