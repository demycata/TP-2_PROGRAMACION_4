# TP Red Social

Angular + NestJS + MongoDB. Red social con publicaciones, me gusta y comentarios (TP #2 de Programación IV, segundo parcial, UTN Avellaneda 2026 C2). Consigna completa en `PROGRAMACION IV - TP #2 - Completo - 2026 C2.pdf`, resumida abajo por sprint para no tener que reabrirla cada vez.

## Forma de trabajo

- La corrección es por sprint de una semana: se trabaja sprint por sprint, en orden. Dentro de cada sprint, una funcionalidad a la vez, de punta a punta (back + front), antes de arrancar la siguiente.
- Antes de escribir código para una funcionalidad nueva, se propone el enfoque (qué archivos, qué approach) y se espera confirmación, salvo que se pida explícitamente avanzar directo.
- El código sigue el estilo ya establecido en este proyecto (ver "Convenciones de código" abajo); no se introducen patrones nuevos sin acordarlo antes.
- Ante cualquier duda o ambigüedad de requerimiento: primero se revisa el PDF de la consigna (la fuente original) y, si sigue sin quedar claro, se consulta antes de asumir.
- Este archivo se mantiene actualizado a medida que se cierra cada funcionalidad (sección "Estado actual" y, si aplica, nuevas reglas de negocio).
- Las decisiones técnicas se documentan también en el README (el usuario estudia de ahí, igual que en el TP del cine).

## Estructura y stack

- `frontend/`: Angular 22 (standalone components, sin NgModules, control flow con `@if`/`@for`, signals). Recién generado con `ng new`, sin dependencias extra.
- `backend/`: NestJS 12 sobre Express. Recién generado con `nest new`, sin dependencias extra (todavía sin Mongoose, JWT ni validación).
- Base de datos: MongoDB Atlas.
- Login por **correo** (no por nombre de usuario). El correo es único en la base; el nombre de usuario también se pide en el registro.
- Imágenes (perfil y publicaciones): dónde se guardan, a confirmar (disco del server con multer o Cloudinary).
- Deploy: a definir (lo explica el profesor).
- Repo git: lo crea el usuario.

## Convenciones de código (no te las hagas repetir)

### Front (heredadas del TP del cine)

- **Servicios** con `@Service()` de `@angular/core`, NO `@Injectable`. Un `@Service` no puede usar constructor DI para sus propias dependencias, así que se inyectan con `inject()` como propiedad de clase:
  ```ts
  @Service()
  export class PublicacionService {
    private http = inject(HttpClient);
  }
  ```
- **Componentes** (`@Component`) sí usan inyección por constructor:
  ```ts
  constructor(private publicacionService: PublicacionService, private router: Router) {}
  ```
- Formularios: `ReactiveFormsModule`, signals `enviado = signal(false)` y `error = signal<string | null>(null)`, `markAllAsTouched()` + early return si `invalid`, mensaje de error en `<small class="error">`.
- Estructura: `src/app/core/` (auth, interceptors, guards), `src/app/services/*.service.ts`, `src/app/features/<área>/<componente>.component/` (cada componente con `.ts` + `.html` + `.css` colocados), `src/app/shared/` (componentes, pipes y directivas reutilizables).
- Rutas lazy-loaded con `loadComponent`; ruta comodín (`path: '**'`) al final.
- **Nunca `alert()`/`confirm()`** (lo prohíbe la consigna): avisos y confirmaciones con modales propios.
- Formato en templates con pipes, no con métodos auxiliares.
- Sin comentarios explicando qué hace el código; solo cuando hay una razón no obvia.

### Back

A definir con la primera funcionalidad (se agregan acá a medida que se acuerdan).

## Resumen de requerimientos por sprint

**General**: solo se accede estando registrado/logueado; diseño trabajado y uniforme (no HTML plano); navegación entre pantallas; mensajes claros al realizar acciones. API con status HTTP correctos (201 created, 400 bad request, 401 unauthorized, etc.): nunca 200 en un error ni 400 en una respuesta correcta.

**Sprint 1**
- Front: proyecto Angular; pantallas Registro, Login, Publicaciones, MiPerfil; navegación sin restricciones de acceso todavía; favicon propio; deploy en hosting.
- Login: formulario con validaciones y mensajes; por correo o por nombre de usuario (el elegido debe ser único en la base); contraseña de al menos 8 caracteres, una mayúscula y un número.
- Registro: formulario con validaciones y mensajes; campos nombre, apellido, correo, nombre de usuario, contraseña, repetir contraseña, fecha de nacimiento, descripción breve + input file para la imagen de perfil. Los usuarios tienen atributo `perfil`: `usuario` por defecto, modificable a `administrador`.
- Back: proyecto Nest con módulos Publicaciones, Autenticación y Usuarios. `POST` registro: valida, guarda con contraseña encriptada, guarda la imagen y su URL. `POST` login: recibe usuario/correo y contraseña sin encriptar, la compara contra el hash y devuelve todos los datos del usuario.

**Sprint 2**
- Front, Publicaciones: listado ordenado por fecha por defecto, cambiable a cantidad de me gusta; paginado; cada publicación es un componente; dar y quitar me gusta; eliminar mis publicaciones.
- Front, Mi Perfil: todos los datos del usuario + foto; mis últimas 3 publicaciones con sus comentarios.
- Back, publicaciones: `POST` alta (título, descripción, imagen opcional guardada) relacionada al usuario; `DELETE` baja lógica (solo el autor o un administrador); `GET` con orden (fecha / me gusta), filtro por usuario, `offset` y `limit`; `POST` me gusta (uno por usuario por publicación); `DELETE` me gusta (solo si lo había dado).

**Sprint 3**
- Front, Publicación (detalle): publicación grande + comentarios; escribir comentarios; comentarios ordenados, carga inicial limitada + botón "cargar más" que agrega sin borrar los anteriores; el autor puede editar su comentario y queda marcado como editado.
- Front, login/registro: guardar el token en el navegador (o cookies).
- Front, pantalla de carga: al iniciar la app, spinner mientras se valida el token contra la ruta autorizar; válido → publicaciones, inválido → login.
- Front, app: al iniciar sesión, contador de 10 minutos; al terminar, modal avisando que quedan 5 minutos y preguntando si se quiere extender (el token vence a los 15); si acepta, refrescar el token. Cualquier 401 redirige al login.
- Back, comentarios: `POST` (usuario + fecha), `PUT` (modifica el mensaje y marca `modificado: true`), `GET` paginado, más recientes primero.
- Back, auth: login y registro generan JWT con identidad del usuario y rol; token en la respuesta o en cookie; vence a los 15 minutos. `POST` autorizar (401 si el token falla; si es válido devuelve los datos del usuario). `POST` refrescar (nuevo token, misma payload, 15 minutos más).

**Sprint 4**
- Front: un administrador puede dar de baja cualquier publicación (en Publicaciones y en Publicación); deja de estar disponible junto con sus comentarios.
- Front, dashboard/usuarios (solo admin): listado de usuarios; alta con los mismos datos del registro + dos radio buttons usuario/administrador; deshabilitar/habilitar (un usuario deshabilitado no puede ingresar y se le avisa al intentar el login).
- Front, dashboard/estadísticas (solo admin): gráficos de distinto tipo (torta, barras, líneas…), cada uno con lapso de tiempo elegible: publicaciones por usuario, comentarios totales, comentarios por publicación.
- Front, app: PWA; 3 pipes propias; 3 directivas propias.
- Back, usuarios (token de admin): `GET` listado, `POST` alta (con perfil elegible), `DELETE` deshabilitar, `POST` rehabilitar.
- Back, estadísticas (token de admin): las rutas `GET` necesarias para los gráficos.

**Sprint 5 (recuperatorio)**
- Clic en el nombre o la foto de otro usuario lleva a su perfil (datos + últimas 3 publicaciones), manteniendo la baja de publicaciones para el admin.
- Publicaciones con scroll infinito en vez de paginación.
- Estadísticas nuevas: ingresos (login) por usuario, visitas a mi perfil (de otros usuarios), me gusta otorgados por día.

**Sprint 6 (final)**
- Guardar / quitar de guardados una publicación (indicando si está guardada); pantalla Guardados.
- Botón compartir (elegir un usuario destino); pantalla Compartidos (qué se compartió conmigo y quién).
- Ordenamientos nuevos: por veces guardada y por veces compartida.
- Back: `POST` guardar, `POST` quitar de guardados, `POST` compartir (destino en el body), `GET` compartidos conmigo con quién los compartió.

## Estado actual

Nada implementado todavía: `frontend/` y `backend/` son los proyectos recién generados. Próximo paso: Sprint 1.
