import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'cargando', pathMatch: 'full' },
  {
    path: 'cargando',
    loadComponent: () =>
      import('./features/auth/cargando.component/cargando.component').then(
        (m) => m.CargandoComponent,
      ),
  },
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
    canActivate: [authGuard],
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
        path: 'publicaciones/nueva',
        loadComponent: () =>
          import('./features/publicaciones/crear-publicacion.component/crear-publicacion.component').then(
            (m) => m.CrearPublicacionComponent,
          ),
      },
      {
        path: 'publicaciones/:id',
        loadComponent: () =>
          import('./features/publicaciones/detalle-publicacion.component/detalle-publicacion.component').then(
            (m) => m.DetallePublicacionComponent,
          ),
      },
      {
        path: 'mi-perfil',
        loadComponent: () =>
          import('./features/perfil/mi-perfil.component/mi-perfil.component').then(
            (m) => m.MiPerfilComponent,
          ),
      },
      {
        path: 'dashboard/usuarios/nuevo',
        canMatch: [adminGuard],
        loadComponent: () =>
          import('./features/dashboard/nuevo-usuario.component/nuevo-usuario.component').then(
            (m) => m.NuevoUsuarioComponent,
          ),
      },
      {
        path: 'dashboard',
        canMatch: [adminGuard],
        loadComponent: () =>
          import('./features/dashboard/dashboard.component/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
        children: [
          { path: '', redirectTo: 'estadisticas', pathMatch: 'full' },
          {
            path: 'estadisticas',
            loadComponent: () =>
              import('./features/dashboard/estadisticas.component/estadisticas.component').then(
                (m) => m.EstadisticasComponent,
              ),
          },
          {
            path: 'usuarios',
            loadComponent: () =>
              import('./features/dashboard/usuarios.component/usuarios.component').then(
                (m) => m.UsuariosComponent,
              ),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
