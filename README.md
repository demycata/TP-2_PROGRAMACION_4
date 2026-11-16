# Commit: red social para estudiantes de programación

TP #2 de Programación IV (segundo parcial). Red social donde los estudiantes publican dudas, proyectos y recursos, con me gusta y comentarios.

- `frontend/`: Angular 22.
- `backend/`: NestJS 12 + MongoDB Atlas (Mongoose).

## Cómo correrlo

### Back

1. Copiar `backend/.env.example` a `backend/.env` y completar `MONGODB_URI` con la cadena de conexión de Atlas, las tres claves de Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, del Dashboard de cloudinary.com) y `JWT_SECRET` con un texto largo al azar (por ejemplo, `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`).
2. `cd backend`, `npm install` y `npm run start:dev`. Levanta en `http://localhost:3000`.

### Front

`cd frontend`, `npm install` y `npm start`. Levanta en `http://localhost:4200` y le pega al back local (`http://localhost:3000`), así que el back tiene que estar corriendo.

## Decisiones técnicas

### Back: 
estructura

- Un módulo por dominio: `auth` (registro, login y token), `usuarios` (administración de usuarios) y `publicaciones` (publicaciones, me gusta, comentarios y estadísticas). Cada módulo tiene su carpeta con controller, service, `dto/` y `entities/` (ahí va el schema de Mongoose).

- **Validación con `class-validator` + `ValidationPipe` global**: cada endpoint recibe un DTO con sus reglas (por ejemplo, `@IsEmail()` o `@MinLength(8)`). Si el body no cumple, Nest responde **400** automáticamente con los mensajes. Con `whitelist` + `forbidNonWhitelisted`, un campo que no está en el DTO también da 400, así nadie puede mandar `perfil: 'administrador'` en el registro. Con `transform`, el body llega convertido a la clase del DTO.
- **CORS** habilitado solo para `FRONTEND_URL` (`app.enableCors({ origin: process.env.FRONTEND_URL })`). El navegador bloquea los pedidos de una página a otro dominio, salvo que el server lo autorice; acá el back autoriza solo al front. 

registro (`POST /auth/registro`)

- **Recibe `multipart/form-data`**, no JSON, porque además de los datos viaja el archivo de la imagen. Los campos de texto llegan al DTO `RegistroDto` y el archivo (campo `imagenPerfil`) lo toma `FileInterceptor('imagenPerfil')`, que usa multer por dentro (viene con `@nestjs/platform-express`). 
- **La entidad `Usuario` está en el módulo `usuarios`**, no en `auth` , porque  la administración de usuarios también la usa. 
- **La contraseña nunca sale en las respuestas**: tiene `select: false` en el schema (las consultas no la traen; el login la va a pedir con `.select('+password')`), pero eso no aplica al documento que devuelve `create()`. Por eso el service la saca a mano antes de responder, en el método privado `sinPassword()` (lo usan el registro y el login): `const { password: _, ...datos } = usuario.toObject()` convierte el documento de Mongoose en un objeto plano y lo desestructura, dejando la contraseña en `_` (convención para "no se usa") y todo el resto en `datos`.
- **`perfil`** es `usuario` por defecto (enum `usuario` / `administrador` en el schema) y no está en el DTO, así que mandarlo en el registro da 400.
- **"Repetir contraseña" se valida solo en el front**: es para que el usuario no se equivoque al tipear, y al back le llega la contraseña una sola vez.

token (JWT)

- **Login y registro devuelven `{ token, usuario }`**. El payload del token es `{ sub, nombreUsuario, perfil }`: `sub` (*subject*, el nombre estándar en JWT) es el `_id` del usuario y `perfil` es el rol. El token está firmado, no encriptado: cualquiera puede leer el payload, pero si alguien lo modifica la firma deja de coincidir y el back lo rechaza.
- **`AuthGuard` (`src/guards/auth/auth.guard.ts`)**: se pone con `@UseGuards(AuthGuard)` en las rutas que necesitan usuario. Lee el header `Authorization: Bearer <token>`, lo verifica con `jwtService.verify()` y deja el payload en `request.user`. Si falta, está mal firmado o venció, responde **401**.
- **`POST /auth/autorizar`**: con el `AuthGuard` responde 401 si el token falla. Si es válido, busca al usuario en la base con `req.user.sub` y lo devuelve (también 401 si ya no existe). El front lo usa al abrir la app, porque no puede verificar la firma: `JWT_SECRET` solo lo tiene el back.
- **`POST /auth/refrescar`**: firma un token nuevo con los mismos datos y una duración completa, y devuelve `{ token }`. Un token no se puede alargar, porque el vencimiento es parte de lo firmado. Hay que pasar solo `sub`, `nombreUsuario` y `perfil`.

publicaciones: 

- **`@UseGuards(AuthGuard)` en todo el controller**: todas las rutas de publicaciones necesitan un usuario logueado. Sin token, o con un token inválido, da 401.

Listado
- **Parámetros validados con un DTO** (`ListarPublicacionesDto`) y `@Query()`, igual que el body. Los query params siempre llegan los valores por defecto están en la clase (`orden = 'fecha'`, `offset = 0`, `limit = 10`) y se usan cuando el parámetro no viene. `limit` tiene un máximo de 50 para que nadie pida la base entera. Un valor inválido (`orden=likes`, `offset=-1`, `usuario=123`) o un parámetro desconocido da 400.
- **Los me gusta se guardan en la publicación**, como un array `meGusta: [{ usuario, fecha }]` (`_id: false` para que Mongoose no le agregue un id a cada uno). 
- **Se usa `aggregate` en vez de `find`** porque para ordenar por me gusta hace falta un dato que no está guardado, la cantidad (`$size` del array). 

baja lógica (`DELETE /publicaciones/:id`)

- **Todas las consultas filtran las eliminadas** con `eliminada: false`, que se suma al filtro del listado, del me gusta y de la baja misma. Las publicaciones creadas antes de agregar el campo no lo tenían, y `eliminada: false` no las encontraba, así que se les puso `eliminada: false` en la base con un `updateMany` de una sola vez. Para el resto de la app, una publicación eliminada no existe: borrarla de nuevo o darle me gusta da 404.

 etiquetas

- **Opcionales**: `etiqueta` puede ser `duda`, `proyecto`, `recurso` o `novedad`, o no venir. En el DTO va `@IsOptional()` + `@IsIn(ETIQUETAS)`: si no viene, se saltea la validación; si viene con otro valor, da 400.
- **El filtro es un query param** (`GET /publicaciones?etiqueta=duda`) que se suma al `$match`, igual que `usuario`. El `countDocuments` usa el mismo filtro, así `total` sirve para el scroll infinito.

 comentarios (`/publicaciones/:id/comentarios`)

- **Un segundo controller dentro del módulo `publicaciones`**:. `ComentariosController` y `ComentariosService` están en la misma carpeta que los de publicaciones, y `PublicacionesModule` registra los dos controllers y las dos entidades en `forFeature`. Con `@Controller('publicaciones/:id/comentarios')`, las rutas quedan anidadas igual que las de me gusta: `POST` y `GET` sobre esa ruta, y `PUT .../:comentarioId`.
- **Colección propia (`comentarios`), no un array dentro de la publicación** como los me gusta: un me gusta solo se cuenta, pero un comentario se pagina, se edita por su id . Cada comentario tiene `publicacion` y `autor` (ObjectId con `ref`), `mensaje` y `modificado`, y la fecha sale de `createdAt` (`timestamps`).
- **Si la publicación está eliminada, sus comentarios tampoco existen**: las rutas chequean primero la publicación (`eliminada: false`) y dan 404. Así, la baja de una publicación se lleva sus comentarios sin tocarlos en la base.

 usuarios (`/usuarios`, solo administradores)

- **`AdminGuard`** (`src/guards/admin/`) va después del `AuthGuard`: `@UseGuards(AuthGuard, AdminGuard)`. El orden importa, porque el `AuthGuard` es el que verifica el token y deja el payload en `req.user`, y el `AdminGuard` solo lee `req.user.perfil`. Si no es administrador, 403 (el token es válido; lo que falta es permiso, no identidad).
- **Rutas**: `GET` listado, `POST` alta (multipart, los mismos campos del registro más `perfil`), `DELETE /:id` deshabilita y `POST /:id/habilitar` rehabilita. Las dos últimas devuelven el usuario actualizado, así el front reemplaza la fila sin volver a pedir el listado. Un administrador no puede deshabilitarse a sí mismo (400), porque se quedaría afuera.
- **Baja lógica con `habilitado: boolean`** (default `true`), como `eliminada` en las publicaciones. A los usuarios que ya existían se les puso `habilitado: true` en la base.
- **El alta no se repite**: crear un usuario (chequear correo y nombre de usuario repetidos, encriptar y subir la foto) pasó a `UsuariosService.crear()`. El registro de `AuthService` la usa y le suma el token; el alta del administrador la usa con el perfil elegido y no genera token. `CrearUsuarioDto extends RegistroDto` y solo agrega `perfil` con `@IsIn`.
- **Un deshabilitado no entra**: el login primero verifica la contraseña y después mira `habilitado` (así no se revela qué usuarios existen) y responde 403 "Tu usuario está deshabilitado…". Si ya tenía la sesión abierta, `autorizar` y `refrescar` también dan 403, así que lo saca al recargar la app o al querer extender la sesión. El `AuthGuard` sigue sin consultar la base en cada pedido (decisión del usuario).

 estadísticas (`/estadisticas`, solo administradores)

- **Un tercer controller dentro del módulo `publicaciones`**, como pide la consigna ("Módulo publicaciones - Estadísticas controller"): `EstadisticasController` + `EstadisticasService`, con `@UseGuards(AuthGuard, AdminGuard)` en todo el controller. La ruta es `/estadisticas` y no `/publicaciones/estadisticas`, porque `GET /publicaciones/:id` tomaría "estadisticas" como un id.
- **Tres rutas `GET`**, todas con `?desde=AAAA-MM-DD&hasta=AAAA-MM-DD` (`LapsoDto`, obligatorias): `publicaciones-por-usuario` (`[{ usuario, cantidad }]`), `comentarios` (`{ total, porDia: [{ fecha, cantidad }] }`) y `comentarios-por-publicacion` (`[{ publicacion, cantidad }]`). Las listas vienen de mayor a menor.
- **Validación de las fechas**: `@Matches` obliga al formato (solo el día, sin hora) e `@IsISO8601({ strict: true })` rechaza fechas que no existen, como el 30 de febrero. Que `desde` no sea posterior a `hasta` se chequea en el service (400), porque compara dos campos.
- **Los días son de Argentina**: `desde` arranca a las 00:00 -03:00 y `hasta` incluye el día entero (se busca `< hasta + 1 día`). Los comentarios por día se agrupan con `$dateToString` y `timezone`, como el mapa de actividad.
- **`aggregate` + `populate`**: `$match` por `createdAt` en el lapso, `$group` por autor o por publicación con `$sum: 1`, y después `populate` sobre el resultado. En publicaciones por usuario hay que pasarle `model: 'Usuario'`, porque el campo `usuario` lo crea el `$project` y no está en el schema de `Publicacion`.
- **Los días sin comentarios valen 0**: el `$group` solo devuelve los días que tienen algo, así que el service recorre el lapso día por día y completa los que faltan. Si no, la línea uniría puntos salteando días.
- **Lo eliminado no cuenta**: ni las publicaciones eliminadas ni los comentarios de esas publicaciones (se excluyen con `$nin` sobre los ids de las eliminadas), igual que en el resto de la app.



### Front: 
estructura

- **Carpetas**: `services/` (servicios que hablan con el back), `features/<área>/<componente>.component/` (una carpeta por pantalla, con `.ts`, `.html` y `.css`) y `shared/` (lo que usan varias pantallas: layouts, validadores, la función de errores).
- **Servicios con `@Service()`** (de `@angular/core`, nuevo en Angular 22) en vez de `@Injectable`. Los componentes sí usan el constructor.
- **Rutas lazy** (`loadComponent`): el código de cada pantalla se descarga recién cuando se entra a ella. `/login` y `/registro` van sueltas; `/publicaciones`, `/publicaciones/nueva`, `/publicaciones/:id` y `/mi-perfil` son hijas de `LayoutComponent`, que dibuja el marco de la app y un `<router-outlet>` donde va la pantalla. Así la barra no se repite en cada componente y no aparece en el login. `''` va a `/cargando` y cualquier ruta inexistente (`'**'`) va a `/login`. 

registro y login

- **Registro en dos pasos**: el formulario son dos `FormGroup`, `credenciales` (correo, usuario, contraseña y repetir) y `datos` (nombre, apellido, nacimiento, descripción y foto), dentro de un `form` que los junta. "Siguiente" valida solo `credenciales`.
- **Validadores propios** (`shared/validators/`): `clavesCoincidenValidator(otroControl)`, , compara "repetir contraseña" con la contraseña. Como solo se ejecuta cuando cambia el campo donde está puesto, el componente se suscribe a los cambios de la contraseña y lo vuelve a ejecutar (`updateValueAndValidity()`); `takeUntilDestroyed()` corta esa suscripción cuando se destruye el componente. `imagenValidator()` revisa tipo (JPG, PNG o WEBP) y tamaño (2 MB), igual que el back.
- **Reglas de la contraseña en vivo**: `toSignal(control.valueChanges)` convierte los cambios del input en una señal, y un `computed` arma la lista de reglas con ✓/✗, que se recalcula sola en cada tecla.
- **Errores del back** (`shared/mensaje-error.ts`): `mensajeDeError()` saca el texto de la respuesta. El `ValidationPipe` de Nest manda los mensajes en un array (se unen), las excepciones mandan un string, y status 0 significa que no se pudo conectar.

sesión

- **`SesionService` (`core/auth/`)** guarda el token y el usuario en `localStorage` al hacer login (`iniciar()`), así siguen estando si se recarga la página. El usuario se expone además como una señal (`usuario()`), así las pantallas que lo muestran se actualizan solas. `cerrar()` borra todo.
- **`tokenInterceptor` (`core/interceptors/`)**: un interceptor es una función por la que pasan todos los pedidos de `HttpClient` antes de salir. Si hay token, clona el pedido y le agrega el header `Authorization: Bearer <token>` (los pedidos son inmutables, por eso se clonan). Se registra con `withInterceptors([tokenInterceptor])` en `app.config.ts`. Así ningún servicio tiene que acordarse de mandar el token.
- **Pantalla de carga y `authGuard` (`core/guards/`)**: el guard protege `LayoutComponent`, así que cubre todas las pantallas logueadas. 
- **Aviso de vencimiento**: `SesionService` programa un `setTimeout` a partir del `exp` del token, no desde que se abrió la página, para que el aviso siga a tiempo después de recargar. `AvisoSesionComponent` (dentro de `LayoutComponent`) muestra la cuenta regresiva: "Extender sesión" llama a `refrescar` y reprograma el aviso, "Cerrar sesión" va al login. Si llega a cero, cierra la sesión y va al login. El ✕ y Escape solo ocultan el modal: la sesión vence igual y el siguiente pedido da 401.

nueva publicación

- **`NuevaPublicacionComponent`** es una tarjeta fija arriba del listado, al estilo del "¿Qué está pasando?" de X . 
- **Al publicar**, la tarjeta se vacía (`form.reset()` + quitar la imagen) y emite `creada` (`output<Publicacion>()`). El feed la agrega arriba del listado (si está ordenado por fecha; si no, lo recarga) y muestra "Publicación creada.". Con `input()`/`output()` los componentes se comunican sin servicios de por medio: el padre le pasa datos al hijo y el hijo le avisa al padre que pasó algo.

listado de publicaciones

- **`PublicacionComponent`**: recibe la publicación con `input.required<Publicacion>()` y solo la muestra. `@let p = publicacion();` guarda el valor en una variable del template para no repetir `publicacion()` en cada línea. 
- **`TiempoRelativoPipe`** : convierte la fecha en "recién", "hace 5 min", "hace 2 h", "hace 3 días" o "hace 2 semanas", y más atrás en la fecha (`dd/mm/aaaa`). Pasando el mouse por encima se ve la fecha completa (`DatePipe` en el `title`).
- **Scroll infinito en vez de botones de página** . Al llegar al final del listado se pide la tanda siguiente y se agrega abajo, sin borrar las anteriores.
- **`AlAparecerDirective` (**: se pone en un elemento (`<div (appAlAparecer)="cargarMas()">`) y emite cuando ese elemento entra en pantalla. Usa `IntersectionObserver`, una API del navegador que avisa cuando un elemento se vuelve visible, sin tener que escuchar el evento `scroll` y calcular posiciones a mano. Con `rootMargin: '300px'` avisa un poco antes de llegar al final, así la tanda siguiente ya está cargando cuando el usuario llega. En el `onDestroy` se desconecta el observador. El "centinela"** es un `div` vacío al final del listado, con la directiva. Solo existe mientras hay más para traer y no se está cargando (`@else if (hayMas())`). 

me gusta

- **`MeGustaComponent` maneja su propio me gusta**: le pega al back directamente y actualiza solo su contador, sin recargar el listado. Está separado de la tarjeta porque lo usan el feed y el detalle (`conTexto` agrega "me gusta" al lado del número).

mi perfil

- **Los datos salen de la sesión** (`SesionService.usuario()`, lo que devolvió el login), sin pedirle nada más al back. 
- **Las últimas 3 publicaciones** usan el mismo `GET /publicaciones` del feed, con `usuario` (el `_id` propio), `orden: 'fecha'` y `limit: 3`. No hizo falta una ruta nueva en el back.
- **Filas compactas** (título, hash, me gusta y fecha), en vez de la tarjeta completa del feed. Cada una lleva a su detalle. Abajo van sus 3 comentarios más recientes (ver "comentarios").
- **Mapa de actividad (`ActividadComponent`)**: como el de GitHub, 26 columnas de 7 días. Cuenta como aporte cada publicación hecha y cada me gusta dado (decisión del usuario). `GET /publicaciones/actividad` devuelve solo los días con actividad (`[{ fecha, cantidad }]`) y el front arma las 182 celdas, con nivel de color según la cantidad. El back agrupa con `$dateToString` en hora de Argentina: en UTC, lo hecho después de las 21 h caería en el día siguiente. Las publicaciones eliminadas no cuentan.

diseño (Commit 2a)

- **Marco de editor**: barra superior con el perfil al centro, riel lateral (Inicio y Nueva), pestañas, migas y barra de estado. Lo arma `LayoutComponent`; las pestañas y migas salen de la ruta actual (`toSignal` de los `NavigationEnd` del router más un `computed`). En celular, el riel pasa a ser la barra de abajo y se suma Perfil.
- **El scroll sigue siendo el de la página**, no el de un panel interno: las barras son `position: sticky`. Así `AlAparecerDirective` y `window.scrollTo` siguen andando sin cambios. Un `sticky` se pega solo dentro de su contenedor; por eso en la barra superior va en el `:host` de `NavbarComponent` y no en el `.navbar`, que mide lo mismo que su contenedor y no tendría recorrido.
- **Hash de cada publicación (`HashCortoPipe`)**: los últimos 7 caracteres del `_id`, como un hash corto de git
- **Pantalla "Nueva"**: es el mismo `NuevaPublicacionComponent` con el atributo `detallada` (dos templates, una sola lógica de formulario). Suma vista previa, imagen arrastrable, Descartar y Ctrl+Enter. 
- **Compartir copia el link (`CopiarLinkDirective`)**: usa `navigator.clipboard` y expone su estado con `exportAs`, así el botón muestra "Link copiado" o "No se pudo copiar" (`#link="copiarLink"`). 

sesión vencida

- **El interceptor maneja el 401** (`tokenInterceptor`): además de agregar el token, escucha la respuesta con `catchError`. Ante un 401 cierra la sesión y navega a `/login`, en un solo lugar y no en cada pantalla.
- **La excepción es `/auth/login`**: ese pedido también da 401 cuando la contraseña está mal, y ahí no terminó ninguna sesión. Se compara por URL y no por "si había token", porque puede quedar un token viejo guardado al intentar ingresar.
- **El error se reenvía con `throwError`**: si el interceptor se lo quedara, el `subscribe` de la pantalla nunca se enteraría y quedaría en "Cargando…".
- **El aviso viaja en el `state` de la navegación**, como "Cuenta creada": no aparece en la URL y no vuelve si se recarga el login. Va en `error`, para que salga en el panel Problemas y no en el aviso verde.

etiquetas y explorador

- **El filtro vive en la URL** (`/publicaciones?etiqueta=duda`): así sobrevive a una recarga y se puede compartir. Los links usan `routerLink` + `[queryParams]`, y el feed escucha `ActivatedRoute.queryParamMap`. Como solo cambia el query param, Angular reutiliza el componente, por eso hay que suscribirse y no alcanza con leerlo una vez. Cada cambio reinicia el scroll infinito, y el filtro se combina con el orden.
- **El explorador está solo en el feed**: lo muestra `LayoutComponent` 

comentarios

- **Dónde se ven**: en el detalle, completos; en Mi Perfil, los 3 más recientes de cada publicación con un link "Ver los N comentarios" al detalle; en el feed, ninguno.
- **`ComentariosComponent`** recibe la publicación y hace todo: carga, formulario y "Cargar más". Con el atributo `resumen` (el mismo truco que `detallada` en la pantalla Nueva) pide 3, no muestra el formulario y cambia "Cargar más" por el link al detalle. Se carga en `ngOnInit`, porque en el constructor el `input()` todavía no tiene valor.

formato del mensaje (código)

El mensaje se guarda en la base como texto plano con marcas tipo markdown: negrita, cursiva, código en línea y bloques de código. Para mostrarlo hice una pipe pura, `formatoMensaje`, que **no devuelve HTML sino datos**: una lista de bloques tipada con una unión discriminada, donde cada bloque es un párrafo o un bloque de código.
Trabaja en tres niveles. Primero recorre el mensaje línea por línea y lo separa en bloques de texto y bloques de código, detectando los triple backticks con una expresión regular. Después, dentro de cada párrafo, busca negrita, cursiva y código con una regex de tres grupos, y arma una lista de partes, cada una con su estilo. Por último, los bloques de código de JavaScript, TypeScript o Python se tokenizan con una regex por lenguaje que distingue comentarios, strings, números y palabras. Las palabras se clasifican en palabra clave, función o variable común, y el resultado se corta en líneas para numerarlas.
Un componente, `app-mensaje`, recorre esos datos con `@for` y `@switch` y pone cada parte en su etiqueta. La razón de devolver datos y no HTML es la **seguridad**: el texto lo escribe el usuario, y si lo metiera con `innerHTML` tendría que escapar todo a mano para evitar un XSS. Así todo pasa por la interpolación `{{ }}`, que Angular escapa solo. Y como la pipe es pura, solo se vuelve a ejecutar cuando cambia el texto, no en cada detección de cambios.

baja por administrador

- **`SoloAdminDirective` es estructural** (la tercera directiva propia; las otras dos son de atributo): con el `*` Angular le pasa el `<ng-template>` del elemento, y la directiva decide si lo crea (`ViewContainerRef.createEmbeddedView`) o lo destruye (`clear`). Es lo mismo que hace `*ngIf` por dentro. La condición está en un `effect` que lee `SesionService.usuario()`, así se actualiza sola si cambia la sesión.
- **Dos usos**: `*appSoloAdmin` lo muestra solo a un administrador, y `*appSoloAdmin="p.autor._id"` lo muestra a un administrador o al autor (el tachito del feed y del detalle). El id va como valor directo y no como `*appSoloAdmin="autor: id"`, porque en la microsintaxis del `*` lo primero siempre es el valor de la propia directiva: Angular leería `autor` como una expresión. Adentro, el input se llama `autor` con `alias: 'appSoloAdmin'`.
- **Esconder el botón no es la seguridad**: el back ya rechaza con 403 la baja de quien no es autor ni administrador. La directiva solo evita mostrar algo que no se puede usar.
- **Baja desde el detalle**: el mismo modal que el feed; al confirmar vuelve a `/publicaciones` con el aviso en el `state` de la navegación (como "Cuenta creada"), y el feed lo muestra en su aviso flotante. Los estilos del modal de baja (`.confirmacion`, `.git-rm`, `.acciones-modal`) pasaron a `styles.css` porque ya se usaban en tres lugares.

dashboard de usuarios

- **`adminGuard` es un `CanMatchFn`**, como el `roleGuard` del ejemplo `guards` del profe. Si no es administrador devuelve un `UrlTree` a `/publicaciones` y no `false`: con `false` el router seguiría buscando otra ruta, caería en el comodín (`**`) y mandaría al login a alguien que tiene la sesión abierta.
- **El link "Usuarios" del riel usa `*appSoloAdmin`** sin valor: solo lo ve un administrador. Ocultarlo no alcanza solo; por eso también está el guard en la ruta y el `AdminGuard` en el back.
- **Listado** (`/dashboard/usuarios`): cada fila con foto, nombre, correo, perfil, fecha de alta y estado. Deshabilitar pide confirmación con el modal; habilitar va directo (no tiene consecuencias). En la fila propia no hay botón.
- **Alta en una pantalla aparte** (`/dashboard/usuarios/nuevo`, decisión del usuario): en un solo paso y en dos columnas, con los dos radio buttons de perfil. Es un componente nuevo que reusa los validadores del registro (`clavesCoincidenValidator`, `imagenValidator`) en vez de reescribir el registro, que está en dos pasos. Al crear vuelve al listado con el aviso en el `state` de la navegación.
- **El 403 de un deshabilitado en el front**: la pantalla de carga (`autorizar`) y "Extender sesión" (`refrescar`) cierran la sesión y van al login con el mensaje del back. El interceptor no se toca, porque solo reacciona al 401.

dashboard y estadísticas

- **Una sola pantalla de dashboard con pestañas** (decisión del usuario): `DashboardComponent` tiene el título, las pestañas "Estadísticas" y "Usuarios" y un `<router-outlet>`. Las pestañas son rutas hijas (`/dashboard/estadisticas` y `/dashboard/usuarios`), así cada una tiene su URL, se puede recargar y el `adminGuard` va una sola vez en la ruta padre. `/dashboard` sola redirige a estadísticas. El link del riel pasó de "Usuarios" a "Dashboard". El alta de usuario (`/dashboard/usuarios/nuevo`) quedó como pantalla aparte, fuera de las pestañas.
- **Chart.js** (decisión del usuario), usado directo y sin `ng2-charts`. Se registran solo las piezas que se usan (`Chart.register(BarController, LineController, DoughnutController, …)`) para que el resto de la librería no entre al bundle. Además, como la ruta es lazy, Chart.js solo se descarga al entrar a estadísticas.
- **`GraficoComponent`** (`shared/`) es un `<canvas>` que recibe la configuración del gráfico como input. Usa `afterRenderEffect` y no `effect`, porque el canvas tiene que estar en la pantalla antes de dibujar. Cada vez que cambia la configuración destruye el gráfico anterior y crea otro, y al salir de la pantalla lo destruye (si no, Chart.js queda escuchando el resize de la ventana).
- **Los colores salen de `styles.css`**: Chart.js dibuja en un canvas y no ve el CSS, así que se leen las variables con `getComputedStyle(document.documentElement)` y se pasan como texto. Los textos, la grilla y el tooltip se configuran una sola vez en `Chart.defaults`.
- **Un tipo de gráfico por estadística**: comentarios realizados en líneas (uno por día, con el total arriba), publicaciones por usuario en barras horizontales (el alto crece con la cantidad de usuarios para que entren todos los nombres) y comentarios por publicación en torta (dona). En la torta van las 6 publicaciones con más comentarios y el resto junto en "Otras": con 30 porciones sería ilegible.
- **El lapso no es un componente** (decisión del usuario): está dentro de `EstadisticasComponent`. Cada gráfico tiene su propio lapso (7, 30 o 90 días, o personalizado con dos fechas) guardado en un `signal<Record<Grafico, Lapso>>`, y lo mismo su carga y su error. Las tres tarjetas se dibujan con un `@for`, así el selector de lapso se escribe una sola vez en el template.
- **Un `computed` por gráfico**: la configuración de cada uno depende solo de sus datos, así cambiar el lapso de uno no vuelve a dibujar los otros dos. Si se cambia el lapso antes de que llegue la respuesta anterior, el pedido viejo se cancela (`unsubscribe`) para que no pise al nuevo.



## Deploy

Front y back en Vercel, como dos proyectos separados que importan el mismo repo:

- **Back**: Root Directory `backend`, preset NestJS. Variables de entorno: `MONGODB_URI`, `FRONTEND_URL` (la URL del front desplegado), las tres de Cloudinary y `JWT_SECRET`. `PORT` no hace falta, lo maneja Vercel.
- **Front**: Root Directory `frontend`, preset Angular. Las rutas como `/login` no existen como archivo: las resuelve el router de Angular en el navegador, así que el hosting tiene que devolver `index.html` para cualquier ruta (si no, recargar la página da 404). El preset Angular de Vercel ya lo hace solo, por eso no hace falta un `vercel.json` con *rewrites*.
- **Atlas**: en Network Access se permite `0.0.0.0/0`, porque Vercel no tiene una IP fija para agregar a la lista.
