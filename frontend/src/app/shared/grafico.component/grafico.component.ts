import { Component, DestroyRef, ElementRef, afterRenderEffect, input, viewChild } from '@angular/core';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';

// registrar solo lo que se usa deja afuera del bundle el resto de Chart.js
Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  Filler,
  DoughnutController,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
);

// Chart.js dibuja en un canvas y no ve el CSS: los colores salen de las variables de styles.css
const estilos = getComputedStyle(document.documentElement);
const variable = (nombre: string) => estilos.getPropertyValue(nombre).trim();

// sin esto Chart.js calcula el alto por la proporción y no respeta el alto del :host
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.color = variable('--c-muted');
Chart.defaults.borderColor = variable('--c-border');
Chart.defaults.font.family = variable('--f-ui');
Chart.defaults.font.size = 12;
Chart.defaults.plugins.tooltip.backgroundColor = variable('--c-surface-2');
Chart.defaults.plugins.tooltip.borderColor = variable('--c-line');
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.titleColor = variable('--c-text');
Chart.defaults.plugins.tooltip.bodyColor = variable('--c-text-2');
Chart.defaults.plugins.tooltip.padding = 10;

@Component({
  selector: 'app-grafico',
  templateUrl: './grafico.component.html',
  styleUrl: './grafico.component.css',
  host: { '[style.height.px]': 'alto()' },
})
export class GraficoComponent {
  configuracion = input.required<ChartConfiguration>();
  alto = input(280);

  private lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private grafico?: Chart;

  constructor(destroyRef: DestroyRef) {
    // afterRenderEffect y no effect: el canvas tiene que existir en la pantalla antes de dibujar
    afterRenderEffect(() => {
      const configuracion = this.configuracion();
      this.grafico?.destroy();
      this.grafico = new Chart(this.lienzo().nativeElement, configuracion);
    });
    destroyRef.onDestroy(() => this.grafico?.destroy());
  }
}
