import { Component, Signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { NavbarComponent } from '../navbar.component/navbar.component';
import { ExploradorComponent } from '../explorador.component/explorador.component';
import { SesionService } from '../../core/auth/sesion.service';
import { Pestana } from '../../models/navegacion.model';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NavbarComponent, ExploradorComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css',
})
export class LayoutComponent {
  private ruta: Signal<string>;
  etiqueta: Signal<string | null>;

  pestana = computed<Pestana | null>(() => {
    const ruta = this.ruta();
    if (ruta === '/publicaciones/nueva') {
      return { archivo: 'nueva-publicacion.md', miga: 'publicaciones › nueva' };
    }
    if (ruta === '/mi-perfil') {
      const usuario = this.sesionService.usuario()?.nombreUsuario;
      return { archivo: 'perfil.md', miga: usuario ? `@${usuario} › perfil.md` : 'perfil.md' };
    }
    if (ruta.startsWith('/publicaciones/')) {
      const archivo = `publicacion-${ruta.slice(-7)}.md`;
      return { archivo, miga: `publicaciones › ${archivo}` };
    }
    return null;
  });

  miga = computed(() => {
    const etiqueta = this.etiqueta();
    return this.pestana()?.miga ?? (etiqueta ? `publicaciones › #${etiqueta}` : 'publicaciones');
  });

  enFeed = computed(() => this.ruta() === '/publicaciones');

  enInicio = computed(() => {
    const ruta = this.ruta();
    return ruta.startsWith('/publicaciones') && ruta !== '/publicaciones/nueva';
  });

  constructor(
    router: Router,
    rutaActiva: ActivatedRoute,
    protected sesionService: SesionService,
  ) {
    this.ruta = toSignal(
      router.events.pipe(
        filter((evento) => evento instanceof NavigationEnd),
        map(() => router.url.split(/[?#]/)[0]),
      ),
      { initialValue: router.url.split(/[?#]/)[0] },
    );
    this.etiqueta = toSignal(rutaActiva.queryParamMap.pipe(map((parametros) => parametros.get('etiqueta'))), {
      initialValue: null,
    });
  }
}
