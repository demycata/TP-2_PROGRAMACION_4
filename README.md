# Commit: red social para estudiantes de programación

TP #2 de Programación IV (segundo parcial). Red social donde los estudiantes publican dudas, proyectos y recursos, con me gusta y comentarios.

- `frontend/`: Angular 22.
- `backend/`: NestJS 12 + MongoDB Atlas (Mongoose).

## Cómo correrlo

### Back

1. Copiar `backend/.env.example` a `backend/.env` y completar `MONGODB_URI` con la cadena de conexión de Atlas y las tres claves de Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, del Dashboard de cloudinary.com).
2. `cd backend`, `npm install` y `npm run start:dev`. Levanta en `http://localhost:3000`.

### Front

`cd frontend`, `npm install` y `npm start`. Levanta en `http://localhost:4200` y le pega al back local (`http://localhost:3000`), así que el back tiene que estar corriendo.

## Decisiones técnicas

### Back: estructura

- Un módulo por dominio, como pide la consigna: `auth` (registro, login y token), `usuarios` (administración de usuarios) y `publicaciones` (publicaciones, me gusta, comentarios y estadísticas). Cada módulo se genera con `nest g resource` y tiene su carpeta con controller, service, `dto/` y `entities/` (ahí va el schema de Mongoose).
- **El back es un módulo ES (ESM)**: `backend/package.json` tiene `"type": "module"`, así que TypeScript compila con `import`/`export` en vez de `require`. Hace falta porque los paquetes de Nest 12 son solo ESM: sin esto el código compilado hacía `require('@nestjs/common')`, y en Vercel la función se caía al arrancar con `ERR_REQUIRE_ESM` (500 en todas las rutas). En local no se notaba porque Node 24 sí acepta ese `require`. La consecuencia en el código es que **los imports relativos llevan `.js`** (`import { AppModule } from './app.module.js'`), aunque el archivo sea `.ts`: en ESM la extensión es obligatoria y TypeScript no la agrega sola.
- **Configuración con `@nestjs/config`**: las variables (`MONGODB_URI`, `PORT`, `FRONTEND_URL` y las de Cloudinary) viven en `backend/.env`, que no se sube al repo. `.env.example` lista qué hay que completar. `ConfigModule.forRoot()` lee el `.env` y carga las variables en `process.env`.
- **Conexión a Mongo con `MongooseModule.forRoot(process.env.MONGODB_URI!)`**, como en el ejemplo de la cátedra. Funciona porque en el array de `imports` primero se ejecuta `ConfigModule.forRoot()`, que ya cargó el `.env` cuando se lee `MONGODB_URI`. El `!` le dice a TypeScript que la variable no va a ser `undefined`.
- **`dns.setServers(['8.8.8.8', '1.1.1.1'])` en `main.ts`**: la cadena de Atlas es `mongodb+srv://`, que necesita una consulta DNS de tipo SRV para encontrar los servidores. Algunos DNS (el del router o el del proveedor) no la responden bien, y la conexión falla con `querySrv ECONNREFUSED`. Con esto Node usa los DNS de Google y Cloudflare.
- **Validación con `class-validator` + `ValidationPipe` global**: cada endpoint recibe un DTO con sus reglas (por ejemplo, `@IsEmail()` o `@MinLength(8)`). Si el body no cumple, Nest responde **400** automáticamente con los mensajes. Con `whitelist` + `forbidNonWhitelisted`, un campo que no está en el DTO también da 400, así nadie puede mandar `perfil: 'administrador'` en el registro. Con `transform`, el body llega convertido a la clase del DTO.
- **Status HTTP correctos**: los errores se lanzan con las excepciones de Nest (`BadRequestException` → 400, `UnauthorizedException` → 401, `ForbiddenException` → 403, `NotFoundException` → 404, `ConflictException` → 409). Un `POST` exitoso responde 201 por defecto. Así se cumple el punto 5 de la consigna sin armar los status a mano.
- **CORS** habilitado solo para `FRONTEND_URL` (`app.enableCors({ origin: process.env.FRONTEND_URL })`). El navegador bloquea los pedidos de una página a otro dominio, salvo que el server lo autorice; acá el back autoriza solo al front. En local es `http://localhost:4200` y en producción es la URL del front en Vercel. Tiene que ir sin `/` al final, porque el navegador compara el origen exacto.

### Back: registro (`POST /auth/registro`)

- **Recibe `multipart/form-data`**, no JSON, porque además de los datos viaja el archivo de la imagen. Los campos de texto llegan al DTO `RegistroDto` y el archivo (campo `imagenPerfil`) lo toma `FileInterceptor('imagenPerfil')`, que usa multer por dentro (viene con `@nestjs/platform-express`). Como no se le indica dónde guardarlo, multer deja el archivo **en memoria** (`archivo.buffer`), que es lo que después se sube a Cloudinary.
- **La imagen se valida con `ParseFilePipe`**: es obligatoria, solo JPG, PNG o WEBP (`FileTypeValidator` mira los primeros bytes del archivo, no solo la extensión) y de hasta 2 MB (`MaxFileSizeValidator`). El límite es bajo porque Vercel corta cualquier request de más de 4,5 MB. El mensaje en inglés de "falta el archivo" se reemplaza por uno en español con `exceptionFactory`.
- **Las imágenes van a Cloudinary**, no al disco del server: en Vercel cada request corre en una función que no guarda archivos entre invocaciones (solo puede escribir en `/tmp`, que se borra), así que una imagen guardada ahí se perdería. Cloudinary la guarda y devuelve una URL pública, que es lo que queda en la base (la consigna pide "guardar la URL"). Se eligió sobre Vercel Blob o Supabase Storage porque permite pedir la imagen ya achicada desde la URL, útil para avatares y el feed.
- **`CloudinaryService` está en `src/shared/cloudinary/`**, fuera de los módulos de negocio, porque lo usan el registro y, más adelante, las publicaciones. `subirImagen(archivo, carpeta)` usa `upload_stream` (sube desde el buffer en memoria) y lo envuelve en una `Promise` para poder usarlo con `await`. Las imágenes quedan en la carpeta `commit/<carpeta>` de Cloudinary (`commit/perfiles` para las de perfil).
- **La entidad `Usuario` está en el módulo `usuarios`**, no en `auth` (el ejemplo de la cátedra la pone en `auth`), porque en el Sprint 4 la administración de usuarios también la usa. `UsuariosModule` la registra con `forFeature` y exporta `MongooseModule`; `AuthModule` importa `UsuariosModule` y así puede inyectar el modelo con `@InjectModel(Usuario.name)`.
- **Contraseña encriptada con `PasswordHasher`** de `@nestjs/authentication`, como en el ejemplo `jwt` de la cátedra. Usa scrypt: el hash guardado empieza con `$scrypt$` e incluye la sal, así que `passwordHasher.verify()` en el login puede comparar sin guardar nada más. Para tenerlo disponible, `app.module.ts` importa `AuthenticationModule.forRoot({ globalGuard: false })` (sin `globalGuard: false` bloquearía todas las rutas).
- **Orden del service**: primero busca si el correo o el nombre de usuario ya existen (**409** diciendo cuál), recién después encripta, sube la imagen y crea el usuario. Va en ese orden para no subir a Cloudinary la imagen de un registro que igual se va a rechazar. Además, `correo` y `nombreUsuario` tienen `unique: true` en el schema, que crea un índice único en Mongo como segunda barrera.
- **La contraseña nunca sale en las respuestas**: tiene `select: false` en el schema (las consultas no la traen; el login la va a pedir con `.select('+password')`), pero eso no aplica al documento que devuelve `create()`. Por eso el service la saca a mano antes de responder, en el método privado `sinPassword()` (lo usan el registro y el login): `const { password: _, ...datos } = usuario.toObject()` convierte el documento de Mongoose en un objeto plano y lo desestructura, dejando la contraseña en `_` (convención para "no se usa") y todo el resto en `datos`.
- **`perfil`** es `usuario` por defecto (enum `usuario` / `administrador` en el schema) y no está en el DTO, así que mandarlo en el registro da 400.
- **"Repetir contraseña" se valida solo en el front**: es para que el usuario no se equivoque al tipear, y al back le llega la contraseña una sola vez.
- **`"multer"` en `types` del `tsconfig.json`**: el tipo `Express.Multer.File` lo agrega `@types/multer`, y como el `tsconfig` limita los tipos globales a `node` y `jest`, sin esto TypeScript no lo encuentra.

### Back: login (`POST /auth/login`)

- **Por nombre de usuario**: la consigna deja elegir entre correo y nombre de usuario, con la condición de que el elegido sea único en la base. `nombreUsuario` ya tiene `unique: true`.
- **Body JSON** con `LoginDto`: `nombreUsuario` y `password`, solo obligatorios. El formato de la contraseña (8 caracteres, una mayúscula y un número) no se valida acá: se controla al registrarse, y una contraseña que no lo cumple no puede coincidir con ninguna guardada, así que igual da 401.
- **Responde 200, no 201**: Nest responde 201 en todo `POST` por defecto, pero el login no crea nada. `@HttpCode(HttpStatus.OK)` lo cambia.
- **Cómo se compara la contraseña**: el usuario se busca con `.select('+password')`, porque el campo tiene `select: false` y si no, no vendría. Después `passwordHasher.verify(recibida, guardada)` toma la sal que está dentro del hash guardado, encripta la contraseña recibida con esa misma sal y compara los resultados. Eso cumple el "debe encriptar la contraseña recibida para confirmar el login" de la consigna: las contraseñas nunca se desencriptan, se comparan los hashes.
- **Mismo 401 para usuario inexistente y contraseña incorrecta** ("Usuario o contraseña incorrectos"): si los mensajes fueran distintos, cualquiera podría averiguar qué nombres de usuario existen probando el login.
- **Devuelve todos los datos del usuario** (como pide la consigna) sin la contraseña, con el mismo `sinPassword()` del registro. El token JWT se agrega en el Sprint 3.

### Front: estructura y base

- **Carpetas**: `services/` (servicios que hablan con el back), `features/<área>/<componente>.component/` (una carpeta por pantalla, con `.ts`, `.html` y `.css`) y `shared/` (lo que usan varias pantallas: layouts, validadores, la función de errores).
- **Servicios con `@Service()`** (de `@angular/core`, nuevo en Angular 22) en vez de `@Injectable`. Un `@Service` no admite inyección por constructor, así que `HttpClient` se pide con `private http = inject(HttpClient)`. Los componentes sí usan el constructor.
- **Entornos** (`src/environments/`, generados con `ng generate environments`): `environment.development.ts` tiene `apiUrl: 'http://localhost:3000'` y `environment.ts` la URL del back en Vercel. `ng serve` usa el de desarrollo y `ng build` el de producción, porque `angular.json` reemplaza un archivo por el otro (`fileReplacements`). Los servicios importan siempre `environments/environment` y no saben en cuál están.
- **Rutas lazy** (`loadComponent`): el código de cada pantalla se descarga recién cuando se entra a ella. `/login` y `/registro` van sueltas; `/publicaciones` y `/mi-perfil` son hijas de `LayoutComponent`, que dibuja la barra de navegación y un `<router-outlet>` donde va la pantalla. Así la barra no se repite en cada componente y no aparece en el login. `''` y cualquier ruta inexistente (`'**'`) van a `/login`. Todavía no hay guards: en el Sprint 1 la consigna pide navegación sin restricciones.
- **Estilos**: las variables del diseño (colores, tipografías, radios) están en `:root` en `styles.css`, junto con clases globales que repiten todas las pantallas (`.input`, `.btn-primario`, `.tarjeta`, `.aviso-error`, `small.error`…). Lo propio de cada pantalla va en su `.css`, que Angular encapsula para que no afecte a otras. Además, Angular avisa si el CSS de un componente pasa de 4 kB.
- **`.input.ng-invalid.ng-touched`**: Angular agrega solo esas clases a los inputs de un formulario reactivo, así que el borde rojo de un campo inválido sale del CSS, sin código.
- **Favicon** propio en SVG (`public/favicon.svg`): la marca del diseño, el cuadrado verde con la "c".

### Front: registro y login

- **`AuthLayoutComponent`** (`shared/auth-layout.component/`): la pantalla partida en dos del diseño, con el panel de la marca a la izquierda y lo que se le pase adentro a la derecha. Login y registro lo usan como `<app-auth-layout> ...formulario... </app-auth-layout>`, y el formulario se dibuja donde está `<ng-content />` (*content projection*). En el celular el panel se oculta.
- **Formularios reactivos** (`ReactiveFormsModule`): cada campo es un `FormControl` con sus validadores. Al enviar, `markAllAsTouched()` marca todos como tocados para que aparezcan los mensajes y, si el formulario es inválido, se corta ahí (early return). Las señales `enviado` (deshabilita el botón mientras se espera al back) y `error` (mensaje del back) controlan el estado de la pantalla.
- **Registro en dos pasos**: el formulario son dos `FormGroup`, `credenciales` (correo, usuario, contraseña y repetir) y `datos` (nombre, apellido, nacimiento, descripción y foto), dentro de un `form` que los junta. "Siguiente" valida solo `credenciales`. Los campos del paso que no se ve se sacan del DOM con `@if`, pero sus `FormControl` siguen existiendo, así que los valores no se pierden al ir y volver. Si el back responde 409 (correo o usuario repetido), vuelve solo al paso 1 para corregirlo.
- **Validadores propios** (`shared/validators/`): `clavesCoincidenValidator(otroControl)`, como en el ejemplo de la cátedra, compara "repetir contraseña" con la contraseña. Como solo se ejecuta cuando cambia el campo donde está puesto, el componente se suscribe a los cambios de la contraseña y lo vuelve a ejecutar (`updateValueAndValidity()`); `takeUntilDestroyed()` corta esa suscripción cuando se destruye el componente. `imagenValidator()` revisa tipo (JPG, PNG o WEBP) y tamaño (2 MB), igual que el back.
- **Reglas de la contraseña en vivo**: `toSignal(control.valueChanges)` convierte los cambios del input en una señal, y un `computed` arma la lista de reglas con ✓/✗, que se recalcula sola en cada tecla.
- **La foto**: un `<input type="file">` no se puede atar con `formControlName`, así que en el `(change)` se toma el archivo y se carga a mano en su `FormControl`. La vista previa usa `URL.createObjectURL(archivo)`, una URL temporal al archivo en memoria del navegador, que se libera con `revokeObjectURL` al cambiar de foto o salir de la pantalla.
- **Envío del registro con `FormData`**: como viaja un archivo, el body no puede ser JSON. Se arma un `FormData` con todos los campos (menos `repetirPassword`, que el back rechazaría) y el archivo, y `HttpClient` lo manda como `multipart/form-data`.
- **Errores del back** (`shared/mensaje-error.ts`): `mensajeDeError()` saca el texto de la respuesta. El `ValidationPipe` de Nest manda los mensajes en un array (se unen), las excepciones mandan un string, y status 0 significa que no se pudo conectar.
- **Login**: solo pide usuario y contraseña obligatorios; el formato de la contraseña se controla en el registro. El botón "Mostrar / Ocultar" cambia el `type` del input entre `password` y `text`. Si sale bien, muestra "Credenciales válidas. Ingresando…" y a los 800 ms navega a `/publicaciones`. Los datos del usuario todavía no se guardan: eso llega con el token en el Sprint 3.
- **"Cuenta creada" en el login**: el registro navega con `router.navigate(['/login'], { state: { mensaje } })`. El `state` viaja con la navegación sin aparecer en la URL, y el login lo lee en su constructor con `router.currentNavigation()`. Si se recarga la página, el mensaje no vuelve a aparecer.

## Deploy

Front y back en Vercel, como dos proyectos separados que importan el mismo repo:

- **Back**: Root Directory `backend`, preset NestJS. Variables de entorno: `MONGODB_URI`, `FRONTEND_URL` (la URL del front desplegado) y las tres de Cloudinary. `PORT` no hace falta, lo maneja Vercel.
- **Front**: Root Directory `frontend`, preset Angular.
- **Atlas**: en Network Access se permite `0.0.0.0/0`, porque Vercel no tiene una IP fija para agregar a la lista.
