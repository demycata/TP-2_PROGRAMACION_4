import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Usuario } from '../models/usuario.model';

@Service()
export class UsuarioService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/usuarios`;

  listar() {
    return this.http.get<Usuario[]>(this.url);
  }

  crear(datos: FormData) {
    return this.http.post<Usuario>(this.url, datos);
  }

  deshabilitar(id: string) {
    return this.http.delete<Usuario>(`${this.url}/${id}`);
  }

  habilitar(id: string) {
    return this.http.post<Usuario>(`${this.url}/${id}/habilitar`, null);
  }
}
