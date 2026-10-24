import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./features/auth/registro.component/registro.component').then(
        (m) => m.RegistroComponent,
      ),
  },
  {
    path: '',
    loadComponent: () =>
      import('./shared/layout.component/layout.component').then((m) => m.LayoutComponent),
    children: [
      {
        path: 'publicaciones',
        loadComponent: () =>
          import('./features/publicaciones/publicaciones.component/publicaciones.component').then(
            (m) => m.PublicacionesComponent,
          ),
      },
      {
        path: 'mi-perfil',
        loadComponent: () =>
          import('./features/perfil/mi-perfil.component/mi-perfil.component').then(
            (m) => m.MiPerfilComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
