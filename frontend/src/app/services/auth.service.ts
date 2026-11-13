import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { DatosLogin, RespuestaAuth, TokenRenovado } from '../models/auth.model';
import { Usuario } from '../models/usuario.model';

@Service()
export class AuthService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/auth`;

  registro(datos: FormData) {
    return this.http.post<RespuestaAuth>(`${this.url}/registro`, datos);
  }

  login(datos: DatosLogin) {
    return this.http.post<RespuestaAuth>(`${this.url}/login`, datos);
  }

  autorizar() {
    return this.http.post<Usuario>(`${this.url}/autorizar`, null);
  }

  refrescar() {
    return this.http.post<TokenRenovado>(`${this.url}/refrescar`, null);
  }
}
