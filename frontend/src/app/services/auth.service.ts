import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';

@Service()
export class AuthService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/auth`;

  registro(datos: FormData) {
    return this.http.post(`${this.url}/registro`, datos);
  }

  login(datos: { nombreUsuario: string; password: string }) {
    return this.http.post(`${this.url}/login`, datos);
  }
}
