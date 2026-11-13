import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Comentario, FiltrosComentarios, ListadoComentarios } from '../models/comentario.model';

@Service()
export class ComentarioService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/publicaciones`;

  listar(publicacion: string, filtros: FiltrosComentarios) {
    return this.http.get<ListadoComentarios>(`${this.url}/${publicacion}/comentarios`, {
      params: { ...filtros },
    });
  }

  crear(publicacion: string, mensaje: string) {
    return this.http.post<Comentario>(`${this.url}/${publicacion}/comentarios`, { mensaje });
  }

  editar(publicacion: string, id: string, mensaje: string) {
    return this.http.put<Comentario>(`${this.url}/${publicacion}/comentarios/${id}`, { mensaje });
  }

  eliminar(publicacion: string, id: string) {
    return this.http.delete<void>(`${this.url}/${publicacion}/comentarios/${id}`);
  }
}
