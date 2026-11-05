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

- **Se adelantó al Sprint 2** (la consigna lo pide en el 3) porque las publicaciones necesitan saber quién es el usuario: el autor, el me gusta "uno por usuario" y la baja "solo el autor o un admin". Mandar el id del usuario desde el front no sirve, porque el back no tendría forma de saber si es cierto.
- **`JwtModule.register()` en `auth.module.ts`** (de `@nestjs/jwt`, como el ejemplo del profe), con `global: true` para que el `JwtService` se pueda inyectar en cualquier módulo sin importarlo de nuevo. La clave para firmar es `JWT_SECRET` del `.env` y el vencimiento se fija con `expiresIn` (acepta textos como `'20s'` o `'15m'`). La consigna pide 15 minutos (`'15m'`). El módulo llama a `ConfigModule.forRoot()` antes, porque se carga antes que `AppModule` y, sin eso, `process.env.JWT_SECRET` todavía estaría vacío.
- **Login y registro devuelven `{ token, usuario }`**. El payload del token es `{ sub, nombreUsuario, perfil }`: `sub` (*subject*, el nombre estándar en JWT) es el `_id` del usuario y `perfil` es el rol. El token está firmado, no encriptado: cualquiera puede leer el payload, pero si alguien lo modifica la firma deja de coincidir y el back lo rechaza.
- **`AuthGuard` (`src/guards/auth/auth.guard.ts`)**: se pone con `@UseGuards(AuthGuard)` en las rutas que necesitan usuario. Lee el header `Authorization: Bearer <token>`, lo verifica con `jwtService.verify()` y deja el payload en `request.user`. Si falta, está mal firmado o venció, responde **401**.
- **Header y no cookie**: el profe usa una cookie, pero el front y el back están en dos dominios `*.vercel.app` distintos, y para el navegador son sitios diferentes. Una cookie `sameSite: 'strict'` no viaja en esas requests, y con `sameSite: 'none'` varios navegadores la bloquean igual por ser "de terceros". El header lo manda el front a mano, así que no depende de eso.

publicaciones: alta (`POST /publicaciones`)

- **`@UseGuards(AuthGuard)` en todo el controller**: todas las rutas de publicaciones necesitan un usuario logueado. Sin token, o con un token inválido, da 401.
- **El autor sale del token, no del body**: el controller lee `req.user.sub` (lo dejó ahí el guard) y se lo pasa al service. Si alguien manda `autor` en el formulario, el `ValidationPipe` lo rechaza con 400 porque no está en el DTO. Así nadie puede publicar a nombre de otro.
- **Imagen opcional**: el mismo `ParseFilePipe` que la foto de perfil (2 MB, JPG/PNG/WEBP), pero con `fileIsRequired: false`. Si viene, se sube a la carpeta `publicaciones` de Cloudinary y se guarda la URL en `imagen`.
- **`autor` es una referencia** (`type: mongoose.Schema.Types.ObjectId, ref: 'Usuario'`): en la base se guarda solo el `_id` del usuario. Ojo con el tipo: `mongoose.Schema.Types.ObjectId` es el tipo *para el schema*, mientras que `Types.ObjectId` es la clase del *valor* (la que se usa para tipar la propiedad en TypeScript o para crear un id con `new Types.ObjectId(...)`). Si en el `@Prop` se pone `Types.ObjectId`, Mongoose guarda el id como string y después no se puede cruzar con el `_id` del usuario (nos pasó).
- **La respuesta (201) trae la publicación igual que el listado**, con el autor y los contadores de me gusta, así el front la puede mostrar sin pedir nada más.
- **`collection: 'publicaciones'` en el `@Schema`**: Mongoose arma el nombre de la colección pluralizando en inglés (agrega una "s"), así que sin esto se llamaría `publicacions`. Con `Usuario` no hizo falta porque "usuarios" sale bien.

publicaciones: listado (`GET /publicaciones?orden=fecha|meGusta&usuario=<id>&offset=0&limit=10`)

- **Parámetros validados con un DTO** (`ListarPublicacionesDto`) y `@Query()`, igual que el body. Los query params siempre llegan como texto, así que `offset` y `limit` llevan `@Type(() => Number)` (de `class-transformer`) para que el `ValidationPipe` los convierta a número antes de validarlos. Los valores por defecto están en la clase (`orden = 'fecha'`, `offset = 0`, `limit = 10`) y se usan cuando el parámetro no viene. `limit` tiene un máximo de 50 para que nadie pida la base entera. Un valor inválido (`orden=likes`, `offset=-1`, `usuario=123`) o un parámetro desconocido da 400.
- **Respuesta `{ publicaciones, total }`**: `total` es la cantidad de publicaciones que cumplen el filtro (`countDocuments`), y el front lo usa para saber cuántas páginas hay. Las dos consultas corren a la vez con `Promise.all`.
- **Los me gusta se guardan en la publicación**, como un array `meGusta: [{ usuario, fecha }]` (`_id: false` para que Mongoose no le agregue un id a cada uno). La fecha va a hacer falta para la estadística de "me gusta por día" del Sprint 5.
- **Se usa `aggregate` en vez de `find`** porque para ordenar por me gusta hace falta un dato que no está guardado, la cantidad (`$size` del array). Un *pipeline* de agregación es una lista de etapas por las que van pasando los documentos, cada una recibe lo que dejó la anterior:
  1. `$match`: el filtro (por autor, si viene `usuario`). En `aggregate` Mongoose no convierte los tipos solo, por eso el id se pasa como `new Types.ObjectId(usuario)`.
  2. `$addFields`: agrega `cantidadMeGusta` y `meGustaDado` (si el usuario del token está en `meGusta.usuario`). `$ifNull` cubre las publicaciones viejas que no tienen el array.
  3. `$project` con `meGusta: 0`: saca el array, así no viaja al front la lista de quiénes dieron me gusta.
  4. `$sort`: por `createdAt` o por `cantidadMeGusta`, siempre desempatando por fecha y `_id`, para que el orden sea estable y una publicación no aparezca en dos páginas.
  5. `$skip` y `$limit`: el paginado.

  Después del `aggregate`, el autor se completa con **`populate`**: `this.publicacionModel.populate(publicaciones, { path: 'autor', select: 'nombre apellido nombreUsuario imagenPerfil' })`. `populate` no es una etapa del pipeline, pero `Model.populate()` funciona sobre los objetos que devuelve el `aggregate`: mira el `ref: 'Usuario'` del schema, busca esos usuarios y reemplaza cada id por el documento (solo con los campos del `select`). Como se hace después del `$limit`, solo se buscan los autores de la página que se devuelve. Para que encuentre el modelo `Usuario`, `PublicacionesModule` importa `UsuariosModule`. La alternativa dentro del pipeline era `$lookup` + `$unwind`; se eligió `populate` porque es la forma que se ve en clase.

publicaciones: me gusta (`POST` y `DELETE /publicaciones/:id/me-gusta`)

- **El `:id` se valida con un DTO** (`IdPublicacionDto`, `@IsMongoId`) y `@Param()`, como el body y los query params. Un id con formato inválido da 400 con el mensaje en español. Nest trae `ParseObjectIdPipe` para lo mismo, pero responde en inglés.
- **Un solo me gusta por usuario, en una sola operación**: `findOneAndUpdate({ _id: id, 'meGusta.usuario': { $ne: usuario } }, { $push: ... })` solo encuentra la publicación si el usuario todavía no está en el array, y en ese caso le agrega el me gusta. Como buscar y modificar es una única operación de Mongo, dos pedidos al mismo tiempo no pueden pasar los dos el control (probado: de 3 pedidos simultáneos, entra uno). Hacerlo en dos pasos (primero leer, después guardar) dejaría ese hueco.
- **Quitar** es igual, al revés: busca la publicación solo si el usuario está en `meGusta` y lo saca con `$pull`.
- **Si no encuentra nada, se averigua por qué**: si la publicación no existe, 404 "La publicación no existe". Si existe, al dar es 409 "Ya le diste me gusta" (choca con el estado actual) y al quitar es 404 "No le habías dado me gusta" (el me gusta que se quiere borrar no existe).
- **`returnDocument: 'after'`** hace que `findOneAndUpdate` devuelva el documento ya modificado (por defecto devuelve el de antes). Reemplaza a `new: true`, que en Mongoose 9 está deprecado.
- **Respuesta**: `{ cantidadMeGusta, meGustaDado }`, que es justo lo que la tarjeta necesita actualizar. Dar devuelve 201 (se creó un me gusta) y quitar devuelve 200.

publicaciones: baja lógica (`DELETE /publicaciones/:id`)

- **Baja lógica**: la publicación no se borra de la base, se marca `eliminada: true`. Así se conservan los datos (para las estadísticas, por ejemplo) y se podría recuperar.
- **Todas las consultas filtran las eliminadas** con `eliminada: false`, que se suma al filtro del listado, del me gusta y de la baja misma. Las publicaciones creadas antes de agregar el campo no lo tenían, y `eliminada: false` no las encontraba, así que se les puso `eliminada: false` en la base con un `updateMany` de una sola vez. Para el resto de la app, una publicación eliminada no existe: borrarla de nuevo o darle me gusta da 404.
- **Permisos**: se busca la publicación (404 si no existe) y se compara su `autor` con el `sub` del token. Si no es el autor y el `perfil` del token no es `administrador`, da **403 Forbidden**: el usuario está identificado (no es un 401), pero no tiene permiso para esa acción. `autor` es un ObjectId, por eso se compara con `.toString()`.
- **204 No Content** (`@HttpCode(HttpStatus.NO_CONTENT)`): la baja salió bien y no hay nada para devolver.

publicaciones: etiquetas

- **Opcionales**: `etiqueta` puede ser `duda`, `proyecto`, `recurso` o `novedad`, o no venir. En el DTO va `@IsOptional()` + `@IsIn(ETIQUETAS)`: si no viene, se saltea la validación; si viene con otro valor, da 400.
- **Una sola lista**: `ETIQUETAS` se exporta desde la entidad y la usan el `enum` del schema y los dos DTOs, para que no queden desparejos. Con `as const` el tipo sale de la misma lista (`(typeof ETIQUETAS)[number]`). En el `@Prop` hay que indicar `type: String`, porque Mongoose no puede deducir el tipo de una unión.
- **El filtro es un query param** (`GET /publicaciones?etiqueta=duda`) que se suma al `$match`, igual que `usuario`. El `countDocuments` usa el mismo filtro, así `total` sirve para el scroll infinito.
- **Las publicaciones viejas no se tocaron**: quedan sin el campo, aparecen en el listado general y no aparecen al filtrar. A diferencia de `eliminada`, acá no hizo falta un `updateMany`, porque el filtro se aplica solo cuando viene una etiqueta.



### Front: 
estructura

- **Carpetas**: `services/` (servicios que hablan con el back), `features/<área>/<componente>.component/` (una carpeta por pantalla, con `.ts`, `.html` y `.css`) y `shared/` (lo que usan varias pantallas: layouts, validadores, la función de errores).
- **Servicios con `@Service()`** (de `@angular/core`, nuevo en Angular 22) en vez de `@Injectable`. Los componentes sí usan el constructor.
- **Rutas lazy** (`loadComponent`): el código de cada pantalla se descarga recién cuando se entra a ella. `/login` y `/registro` van sueltas; `/publicaciones`, `/publicaciones/nueva`, `/publicaciones/:id` y `/mi-perfil` son hijas de `LayoutComponent`, que dibuja el marco de la app y un `<router-outlet>` donde va la pantalla. Así la barra no se repite en cada componente y no aparece en el login. `''` y cualquier ruta inexistente (`'**'`) van a `/login`. 

registro y login

- **Registro en dos pasos**: el formulario son dos `FormGroup`, `credenciales` (correo, usuario, contraseña y repetir) y `datos` (nombre, apellido, nacimiento, descripción y foto), dentro de un `form` que los junta. "Siguiente" valida solo `credenciales`. Los campos del paso que no se ve se sacan del DOM con `@if`, pero sus `FormControl` siguen existiendo, así que los valores no se pierden al ir y volver. Si el back responde 409 (correo o usuario repetido), vuelve solo al paso 1 para corregirlo.
- **Validadores propios** (`shared/validators/`): `clavesCoincidenValidator(otroControl)`, , compara "repetir contraseña" con la contraseña. Como solo se ejecuta cuando cambia el campo donde está puesto, el componente se suscribe a los cambios de la contraseña y lo vuelve a ejecutar (`updateValueAndValidity()`); `takeUntilDestroyed()` corta esa suscripción cuando se destruye el componente. `imagenValidator()` revisa tipo (JPG, PNG o WEBP) y tamaño (2 MB), igual que el back.
- **Reglas de la contraseña en vivo**: `toSignal(control.valueChanges)` convierte los cambios del input en una señal, y un `computed` arma la lista de reglas con ✓/✗, que se recalcula sola en cada tecla.
- **Errores del back** (`shared/mensaje-error.ts`): `mensajeDeError()` saca el texto de la respuesta. El `ValidationPipe` de Nest manda los mensajes en un array (se unen), las excepciones mandan un string, y status 0 significa que no se pudo conectar.

sesión

- **`SesionService` (`core/auth/`)** guarda el token y el usuario en `localStorage` al hacer login (`iniciar()`), así siguen estando si se recarga la página. El usuario se expone además como una señal (`usuario()`), así las pantallas que lo muestran se actualizan solas. `cerrar()` borra todo.
- **`tokenInterceptor` (`core/interceptors/`)**: un interceptor es una función por la que pasan todos los pedidos de `HttpClient` antes de salir. Si hay token, clona el pedido y le agrega el header `Authorization: Bearer <token>` (los pedidos son inmutables, por eso se clonan). Se registra con `withInterceptors([tokenInterceptor])` en `app.config.ts`. Así ningún servicio tiene que acordarse de mandar el token.
- **El registro no inicia sesión**: el back también devuelve el token, pero el flujo sigue siendo ir a `/login` con el mensaje "Cuenta creada, ya podés ingresar.".

nueva publicación

- **`ModalComponent` (`shared/modal.component/`)**: un modal genérico (fondo oscuro con blur, título y ✕) que recibe su contenido con `<ng-content />`, igual que `AuthLayoutComponent`. Tiene un `input.required<string>()` para el título y un `output()` llamado `cerrar`, que se emite con la ✕ o con Escape (`host: { '(document:keydown.escape)': ... }` escucha la tecla en todo el documento). El modal no decide cuándo cerrarse: avisa, y el que lo usa decide (por ejemplo, el de eliminar no se cierra mientras está borrando). Se usa para confirmar la baja y se va a usar para el aviso de sesión del Sprint 3.
- **`NuevaPublicacionComponent`** es una tarjeta fija arriba del listado, al estilo del "¿Qué está pasando?" de X (decisión del usuario; en el mockup solo se publica desde la pantalla "Nueva"). Tiene la foto del usuario, el título y el mensaje en campos sin borde, y abajo el ícono para adjuntar una imagen y "Publicar". La tarjeta se marca en verde mientras se escribe (`:focus-within`, que se activa cuando cualquier elemento de adentro tiene el foco). El mensaje crece con el texto gracias a `field-sizing: content` (Chrome y Edge; en el resto queda de 2 líneas con scroll).
- **"Publicar" queda deshabilitado mientras falte el título o el mensaje** (`[disabled]="form.invalid || enviado()"`), como "Postear" en X, así que no hace falta mostrar los errores de campo obligatorio. Los errores de la imagen y los del back sí se muestran.
- **Al publicar**, la tarjeta se vacía (`form.reset()` + quitar la imagen) y emite `creada` (`output<Publicacion>()`). El feed la agrega arriba del listado (si está ordenado por fecha; si no, lo recarga) y muestra "Publicación creada.". Con `input()`/`output()` los componentes se comunican sin servicios de por medio: el padre le pasa datos al hijo y el hijo le avisa al padre que pasó algo.
- **`viewChild.required('selector')`** da acceso al `<input type="file">` marcado con `#selector` en el template, para poder limpiarlo desde el código al quitar la imagen o después de publicar.
- **Imagen opcional con vista previa**: igual que la foto del registro (`imagenValidator()` + `URL.createObjectURL()`), pero sin `Validators.required`. "Quitar" limpia el control y también el `value` del `<input type="file">`, porque si no, volver a elegir el mismo archivo no dispara el `change`.

listado de publicaciones

- **`PublicacionComponent`** (la tarjeta, como pide la consigna): recibe la publicación con `input.required<Publicacion>()` y solo la muestra. `@let p = publicacion();` guarda el valor en una variable del template para no repetir `publicacion()` en cada línea. El `@` de `@usuario` se escribe `&#64;`, porque en los templates de Angular `@` arranca un bloque (`@if`, `@for`).
- **`TiempoRelativoPipe`** (`shared/pipes/`, una de las pipes propias que pide el Sprint 4): convierte la fecha en "recién", "hace 5 min", "hace 2 h", "hace 3 días" o "hace 2 semanas", y más atrás en la fecha (`dd/mm/aaaa`). Pasando el mouse por encima se ve la fecha completa (`DatePipe` en el `title`).
- **Scroll infinito en vez de botones de página** (decisión del usuario; la consigna lo pide recién en el Sprint 5, y en el Sprint 2 pide "cantidad limitada, permitiendo paginar": se sigue cumpliendo, porque el back sigue mandando de a 5 con `offset` y `limit`). Al llegar al final del listado se pide la tanda siguiente y se agrega abajo, sin borrar las anteriores.
- **`AlAparecerDirective` (`shared/directives/`, una de las directivas propias que pide el Sprint 4)**: se pone en un elemento (`<div (appAlAparecer)="cargarMas()">`) y emite cuando ese elemento entra en pantalla. Usa `IntersectionObserver`, una API del navegador que avisa cuando un elemento se vuelve visible, sin tener que escuchar el evento `scroll` y calcular posiciones a mano. Con `rootMargin: '300px'` avisa un poco antes de llegar al final, así la tanda siguiente ya está cargando cuando el usuario llega. En el `onDestroy` se desconecta el observador.
- **El "centinela"** es un `div` vacío al final del listado, con la directiva. Solo existe mientras hay más para traer y no se está cargando (`@else if (hayMas())`). Así, cada vez que termina una carga, el centinela se vuelve a crear, y si sigue a la vista (por ejemplo, en una pantalla alta con pocas publicaciones), el observador nuevo avisa enseguida y se pide otra tanda.
- **El feed** guarda el estado en señales (`orden`, `publicaciones`, `total`, `cargando`, `error`), y `hayMas` es un `computed` (`publicaciones().length < total()`). El `offset` de cada pedido es la cantidad que ya hay en pantalla. Al final se muestra "Cargando publicaciones…", "No hay más publicaciones." o, si falló, el error con un botón "Reintentar".
- **Cambiar el orden** vacía la lista y empieza de nuevo. Si había un pedido del orden anterior en camino, se cancela (`unsubscribe()` de la `Subscription`), porque si no, su respuesta se agregaría a la lista nueva.
- **Sin repetidos**: si alguien publica mientras uno scrollea, todas las publicaciones se corren un lugar y la tanda siguiente puede traer una que ya está en pantalla. Antes de agregar, se descartan las que ya están (por `_id`, con un `Set`). Además, `track publicacion._id` en el `@for` da error si hay ids repetidos.
- **Avisos flotantes**: "Publicación creada." y "Publicación eliminada." aparecen abajo, en el centro de la pantalla (`position: fixed`), y se van solos a los 3 segundos (`setTimeout`). Con scroll infinito, un aviso arriba de todo no se vería al eliminar una publicación que está más abajo.
- **`HttpClient` con `params`**: `http.get(url, { params: { ...filtros } })` arma el `?orden=…&offset=…` solo, con los valores codificados.

me gusta

- **`MeGustaComponent` maneja su propio me gusta**: le pega al back directamente y actualiza solo su contador, sin recargar el listado. Está separado de la tarjeta porque lo usan el feed y el detalle (`conTexto` agrega "me gusta" al lado del número).
- **`linkedSignal`**: la publicación llega como `input()`, que es de solo lectura, pero el contador tiene que poder cambiar. `linkedSignal(() => ({ cantidadMeGusta, meGustaDado }))` crea una señal que se puede modificar con `set()` y que arranca con lo que vino en el input. Si el input cambia (por ejemplo, otra página del listado), la vuelve a copiar.
- **Sin actualización "optimista"**: el contador cambia cuando el back confirma, no antes. Mientras tanto el botón queda deshabilitado, así un doble clic no manda dos pedidos. Si el back responde con error, se muestra el mensaje al lado del botón.
- **Ordenado por "Más me gusta", la lista no se reordena al dar me gusta**: el orden se aplica cuando se carga la página, así la tarjeta no se mueve de lugar mientras el usuario está mirando.

eliminar publicación

- **El tachito aparece solo en mis publicaciones**: `esMia` es un `computed` que compara el `_id` del usuario de la sesión (`SesionService`) con el del autor. Igual el que decide es el back (403), esto es solo para no mostrar un botón que no sirve.
- **La tarjeta no elimina, avisa**: emite `eliminar` con la publicación (`output<Publicacion>()`) y el feed abre el modal de confirmación (nunca `confirm()`, que lo prohíbe la consigna). Así el modal, el pedido al back y la recarga del listado quedan en un solo lugar.
- **`aEliminar = signal<Publicacion | null>(null)`** hace de "modal abierto o cerrado" y a la vez guarda qué publicación se va a borrar, para mostrar su título en el modal.
- **Después de eliminar** se saca la publicación de la lista y se resta 1 al `total`, sin recargar, así no se pierde la posición del scroll. El `offset` de la tanda siguiente sigue siendo correcto: en el back también hay una menos.
- **`.btn-peligro`** (rojo, en `styles.css`) para las acciones destructivas.

mi perfil

- **Los datos salen de la sesión** (`SesionService.usuario()`, lo que devolvió el login), sin pedirle nada más al back. En el Sprint 3, la ruta `autorizar` va a devolver los datos actualizados del usuario cada vez que arranca la app.
- **Las últimas 3 publicaciones** usan el mismo `GET /publicaciones` del feed, con `usuario` (el `_id` propio), `orden: 'fecha'` y `limit: 3`. No hizo falta una ruta nueva en el back.
- **Datos que se muestran**: foto, nombre y apellido, `@usuario`, descripción y "miembro desde" (`createdAt` con `DatePipe`), con el formato de encabezado YAML del mockup. El correo, la fecha de nacimiento y el perfil quedaron afuera a propósito.
- **Si se muestra la fecha de nacimiento**, va con `date: 'dd/MM/yyyy' : 'UTC'`: el back guarda "2003-03-14" como la medianoche UTC de ese día. Argentina está en UTC−3, así que en hora local daría el 13/03 a las 21 h y la fecha saldría un día antes. El tercer parámetro de `DatePipe` es la zona horaria en la que se muestra.
- **Filas compactas** (título, hash, me gusta y fecha), como en el mockup, en vez de la tarjeta completa del feed. Cada una lleva a su detalle. Los comentarios se agregan en el Sprint 3.
- **Mapa de actividad (`ActividadComponent`)**: como el de GitHub, 26 columnas de 7 días. Cuenta como aporte cada publicación hecha y cada me gusta dado (decisión del usuario). `GET /publicaciones/actividad` devuelve solo los días con actividad (`[{ fecha, cantidad }]`) y el front arma las 182 celdas, con nivel de color según la cantidad. El back agrupa con `$dateToString` en hora de Argentina: en UTC, lo hecho después de las 21 h caería en el día siguiente. Las publicaciones eliminadas no cuentan.
- **Si no hay sesión** (todavía no hay guards de ruta), muestra un aviso con link al login en vez de romperse.

diseño (Commit 2a)

- **Marco de editor**: barra superior con el perfil al centro, riel lateral (Inicio y Nueva), pestañas, migas y barra de estado. Lo arma `LayoutComponent`; las pestañas y migas salen de la ruta actual (`toSignal` de los `NavigationEnd` del router más un `computed`). En celular, el riel pasa a ser la barra de abajo y se suma Perfil.
- **El scroll sigue siendo el de la página**, no el de un panel interno: las barras son `position: sticky`. Así `AlAparecerDirective` y `window.scrollTo` siguen andando sin cambios. Un `sticky` se pega solo dentro de su contenedor; por eso en la barra superior va en el `:host` de `NavbarComponent` y no en el `.navbar`, que mide lo mismo que su contenedor y no tendría recorrido.
- **Panel "Problemas" en el login**: el mockup lista ahí las reglas de la contraseña, pero el login no valida el formato (decisión del usuario). Se usa el mismo panel para los campos vacíos y el error del back. El contador de la barra de estado sale de la misma lista.
- **Hash de cada publicación (`HashCortoPipe`)**: los últimos 7 caracteres del `_id`, como un hash corto de git. Es un dato real, no decorativo, y cuenta como pipe propia del Sprint 4.
- **Pantalla "Nueva"**: es el mismo `NuevaPublicacionComponent` con el atributo `detallada` (dos templates, una sola lógica de formulario). Suma vista previa, imagen arrastrable, Descartar y Ctrl+Enter. El mensaje sigue siendo texto plano, por eso no tiene la barra de formato del mockup.
- **Números de línea con un "espejo"**: un `div` invisible detrás del `textarea` repite el texto, una línea por `div`, con el mismo font y ancho. Le da el alto al `textarea` (crece sin scroll) y un contador de CSS numera cada línea real, aunque ocupe varias filas al cortarse.
- **Compartir copia el link (`CopiarLinkDirective`)**: usa `navigator.clipboard` y expone su estado con `exportAs`, así el botón muestra "Link copiado" o "No se pudo copiar" (`#link="copiarLink"`). Cuenta como directiva propia del Sprint 4. El "compartir con un usuario" del Sprint 6 va aparte.
- **Detalle adelantado del Sprint 3**: el link necesitaba un destino, así que `/publicaciones/:id` y `GET /publicaciones/:id` ya existen, sin comentarios. El feed corta el mensaje a 3 líneas (`-webkit-line-clamp`) porque el texto completo ya se puede leer ahí.
- **`withInMemoryScrolling({ scrollPositionRestoration: 'top' })`**: al cambiar de pantalla se vuelve arriba. Sin esto, entrar a una publicación desde abajo del feed abría el detalle a mitad de página.

sesión vencida

- **El interceptor maneja el 401** (`tokenInterceptor`): además de agregar el token, escucha la respuesta con `catchError`. Ante un 401 cierra la sesión y navega a `/login`, en un solo lugar y no en cada pantalla.
- **La excepción es `/auth/login`**: ese pedido también da 401 cuando la contraseña está mal, y ahí no terminó ninguna sesión. Se compara por URL y no por "si había token", porque puede quedar un token viejo guardado al intentar ingresar.
- **El error se reenvía con `throwError`**: si el interceptor se lo quedara, el `subscribe` de la pantalla nunca se enteraría y quedaría en "Cargando…".
- **El aviso viaja en el `state` de la navegación**, como "Cuenta creada": no aparece en la URL y no vuelve si se recarga el login. Va en `error`, para que salga en el panel Problemas y no en el aviso verde.

etiquetas y explorador

- **El filtro vive en la URL** (`/publicaciones?etiqueta=duda`): así sobrevive a una recarga y se puede compartir. Los links usan `routerLink` + `[queryParams]`, y el feed escucha `ActivatedRoute.queryParamMap`. Como solo cambia el query param, Angular reutiliza el componente, por eso hay que suscribirse y no alcanza con leerlo una vez. Cada cambio reinicia el scroll infinito, y el filtro se combina con el orden.
- **El explorador está solo en el feed** (decisión del usuario): lo muestra `LayoutComponent` con un `@if`, porque en el mockup es una columna del marco, entre el riel y el editor, y no parte del contenido de la pantalla.
- **Sin contadores** (decisión del usuario): el mockup muestra cuántas publicaciones hay por etiqueta, pero habría necesitado una ruta nueva y mantenerlos actualizados al publicar y eliminar.
- **La etiqueta se elige solo en la pantalla Nueva**: el compositor del feed publica sin etiqueta (decisión del usuario). Por eso, si hay un filtro activo, lo publicado no se agrega a la lista.
- **`undefined` en los parámetros**: `HttpClient` convierte un valor `undefined` en el texto `"undefined"`, y el back lo rechazaría. Por eso `etiqueta` se agrega a los filtros solo si tiene valor (`...(etiqueta ? { etiqueta } : {})`).
- **Colores con una variable por clase**: `.color-duda` y las demás definen `--c-etiqueta`, y el chip, el explorador y el selector usan esa misma variable. `color-mix()` arma el fondo suave a partir del color de cada etiqueta.
- **Pantallas angostas**: debajo de 1000px no entra la columna del explorador, así que se oculta y aparecen chips horizontales arriba del feed. En celular, la cabecera de la tarjeta oculta el hash y corta el nombre con "…" para que el chip y el tachito entren.


## Deploy

Front y back en Vercel, como dos proyectos separados que importan el mismo repo:

- **Back**: Root Directory `backend`, preset NestJS. Variables de entorno: `MONGODB_URI`, `FRONTEND_URL` (la URL del front desplegado), las tres de Cloudinary y `JWT_SECRET`. `PORT` no hace falta, lo maneja Vercel.
- **Front**: Root Directory `frontend`, preset Angular. Las rutas como `/login` no existen como archivo: las resuelve el router de Angular en el navegador, así que el hosting tiene que devolver `index.html` para cualquier ruta (si no, recargar la página da 404). El preset Angular de Vercel ya lo hace solo, por eso no hace falta un `vercel.json` con *rewrites*.
- **Atlas**: en Network Access se permite `0.0.0.0/0`, porque Vercel no tiene una IP fija para agregar a la lista.
