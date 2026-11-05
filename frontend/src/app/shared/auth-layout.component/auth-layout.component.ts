import { Component, input } from '@angular/core';

// Componente que sirve como layout para las páginas de autenticación (login y registro).


@Component({
  selector: 'app-auth-layout',
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.css',
})
export class AuthLayoutComponent {
  titulo = input.required<string>();
  errores = input(0);

  numerosDeLinea = Array.from({ length: 17 }, (_, i) => i + 1).join('\n');
}
