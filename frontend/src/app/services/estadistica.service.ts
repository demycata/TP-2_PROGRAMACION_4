import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  ComentariosEnLapso,
  ComentariosPorPublicacion,
  Lapso,
  PublicacionesPorUsuario,
} from '../models/estadistica.model';

@Service()
export class EstadisticaService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/estadisticas`;

  publicacionesPorUsuario({ desde, hasta }: Lapso) {
    return this.http.get<PublicacionesPorUsuario[]>(`${this.url}/publicaciones-por-usuario`, {
      params: { desde, hasta },
    });
  }

  comentarios({ desde, hasta }: Lapso) {
    return this.http.get<ComentariosEnLapso>(`${this.url}/comentarios`, { params: { desde, hasta } });
  }

  comentariosPorPublicacion({ desde, hasta }: Lapso) {
    return this.http.get<ComentariosPorPublicacion[]>(`${this.url}/comentarios-por-publicacion`, {
      params: { desde, hasta },
    });
  }
}
