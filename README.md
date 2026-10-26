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



### Front: 
estructura

- **Carpetas**: `services/` (servicios que hablan con el back), `features/<área>/<componente>.component/` (una carpeta por pantalla, con `.ts`, `.html` y `.css`) y `shared/` (lo que usan varias pantallas: layouts, validadores, la función de errores).
- **Servicios con `@Service()`** (de `@angular/core`, nuevo en Angular 22) en vez de `@Injectable`. Los componentes sí usan el constructor.
- **Rutas lazy** (`loadComponent`): el código de cada pantalla se descarga recién cuando se entra a ella. `/login` y `/registro` van sueltas; `/publicaciones` y `/mi-perfil` son hijas de `LayoutComponent`, que dibuja la barra de navegación y un `<router-outlet>` donde va la pantalla. Así la barra no se repite en cada componente y no aparece en el login. `''` y cualquier ruta inexistente (`'**'`) van a `/login`. 

registro y login

- **Registro en dos pasos**: el formulario son dos `FormGroup`, `credenciales` (correo, usuario, contraseña y repetir) y `datos` (nombre, apellido, nacimiento, descripción y foto), dentro de un `form` que los junta. "Siguiente" valida solo `credenciales`. Los campos del paso que no se ve se sacan del DOM con `@if`, pero sus `FormControl` siguen existiendo, así que los valores no se pierden al ir y volver. Si el back responde 409 (correo o usuario repetido), vuelve solo al paso 1 para corregirlo.
- **Validadores propios** (`shared/validators/`): `clavesCoincidenValidator(otroControl)`, , compara "repetir contraseña" con la contraseña. Como solo se ejecuta cuando cambia el campo donde está puesto, el componente se suscribe a los cambios de la contraseña y lo vuelve a ejecutar (`updateValueAndValidity()`); `takeUntilDestroyed()` corta esa suscripción cuando se destruye el componente. `imagenValidator()` revisa tipo (JPG, PNG o WEBP) y tamaño (2 MB), igual que el back.
- **Reglas de la contraseña en vivo**: `toSignal(control.valueChanges)` convierte los cambios del input en una señal, y un `computed` arma la lista de reglas con ✓/✗, que se recalcula sola en cada tecla.
- **Errores del back** (`shared/mensaje-error.ts`): `mensajeDeError()` saca el texto de la respuesta. El `ValidationPipe` de Nest manda los mensajes en un array (se unen), las excepciones mandan un string, y status 0 significa que no se pudo conectar.


## Deploy

Front y back en Vercel, como dos proyectos separados que importan el mismo repo:

- **Back**: Root Directory `backend`, preset NestJS. Variables de entorno: `MONGODB_URI`, `FRONTEND_URL` (la URL del front desplegado) y las tres de Cloudinary. `PORT` no hace falta, lo maneja Vercel.
- **Front**: Root Directory `frontend`, preset Angular. Las rutas como `/login` no existen como archivo: las resuelve el router de Angular en el navegador, así que el hosting tiene que devolver `index.html` para cualquier ruta (si no, recargar la página da 404). El preset Angular de Vercel ya lo hace solo, por eso no hace falta un `vercel.json` con *rewrites*.
- **Atlas**: en Network Access se permite `0.0.0.0/0`, porque Vercel no tiene una IP fija para agregar a la lista.
