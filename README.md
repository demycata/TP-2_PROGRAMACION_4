# Commit: red social para estudiantes de programación

TP #2 de Programación IV (segundo parcial). Red social donde los estudiantes publican dudas, proyectos y recursos, con me gusta y comentarios.

- `frontend/`: Angular 22.
- `backend/`: NestJS 12 + MongoDB Atlas (Mongoose).

## Cómo correrlo

### Back

1. Copiar `backend/.env.example` a `backend/.env` y completar `MONGODB_URI` con la cadena de conexión de Atlas.
2. `cd backend`, `npm install` y `npm run start:dev`. Levanta en `http://localhost:3000`.

### Front

`cd frontend`, `npm install` y `npm start`. Levanta en `http://localhost:4200`.

## Decisiones técnicas

### Back: estructura

- Un módulo por dominio, como pide la consigna: `auth` (registro, login y token), `usuarios` (administración de usuarios) y `publicaciones` (publicaciones, me gusta, comentarios y estadísticas). Cada módulo se genera con `nest g resource` y tiene su carpeta con controller, service, `dto/` y `entities/` (ahí va el schema de Mongoose).
- **El back es un módulo ES (ESM)**: `backend/package.json` tiene `"type": "module"`, así que TypeScript compila con `import`/`export` en vez de `require`. Hace falta porque los paquetes de Nest 12 son solo ESM: sin esto el código compilado hacía `require('@nestjs/common')`, y en Vercel la función se caía al arrancar con `ERR_REQUIRE_ESM` (500 en todas las rutas). En local no se notaba porque Node 24 sí acepta ese `require`. La consecuencia en el código es que **los imports relativos llevan `.js`** (`import { AppModule } from './app.module.js'`), aunque el archivo sea `.ts`: en ESM la extensión es obligatoria y TypeScript no la agrega sola.
- **Configuración con `@nestjs/config`**: las variables (`MONGODB_URI`, `PORT`, `FRONTEND_URL`) viven en `backend/.env`, que no se sube al repo. `.env.example` lista qué hay que completar. `ConfigModule.forRoot()` lee el `.env` y carga las variables en `process.env`.
- **Conexión a Mongo con `MongooseModule.forRoot(process.env.MONGODB_URI!)`**, como en el ejemplo de la cátedra. Funciona porque en el array de `imports` primero se ejecuta `ConfigModule.forRoot()`, que ya cargó el `.env` cuando se lee `MONGODB_URI`. El `!` le dice a TypeScript que la variable no va a ser `undefined`.
- **`dns.setServers(['8.8.8.8', '1.1.1.1'])` en `main.ts`**: la cadena de Atlas es `mongodb+srv://`, que necesita una consulta DNS de tipo SRV para encontrar los servidores. Algunos DNS (el del router o el del proveedor) no la responden bien, y la conexión falla con `querySrv ECONNREFUSED`. Con esto Node usa los DNS de Google y Cloudflare.
- **Validación con `class-validator` + `ValidationPipe` global**: cada endpoint recibe un DTO con sus reglas (por ejemplo, `@IsEmail()` o `@MinLength(8)`). Si el body no cumple, Nest responde **400** automáticamente con los mensajes. Con `whitelist` + `forbidNonWhitelisted`, un campo que no está en el DTO también da 400, así nadie puede mandar `perfil: 'administrador'` en el registro. Con `transform`, el body llega convertido a la clase del DTO.
- **Status HTTP correctos**: los errores se lanzan con las excepciones de Nest (`BadRequestException` → 400, `UnauthorizedException` → 401, `ForbiddenException` → 403, `NotFoundException` → 404, `ConflictException` → 409). Un `POST` exitoso responde 201 por defecto. Así se cumple el punto 5 de la consigna sin armar los status a mano.
- **CORS** habilitado solo para `FRONTEND_URL` (`app.enableCors({ origin: process.env.FRONTEND_URL })`). El navegador bloquea los pedidos de una página a otro dominio, salvo que el server lo autorice; acá el back autoriza solo al front. En local es `http://localhost:4200` y en producción es la URL del front en Vercel. Tiene que ir sin `/` al final, porque el navegador compara el origen exacto.

## Deploy

Front y back en Vercel, como dos proyectos separados que importan el mismo repo:

- **Back**: Root Directory `backend`, preset NestJS. Variables de entorno: `MONGODB_URI` y `FRONTEND_URL` (la URL del front desplegado). `PORT` no hace falta, lo maneja Vercel.
- **Front**: Root Directory `frontend`, preset Angular.
- **Atlas**: en Network Access se permite `0.0.0.0/0`, porque Vercel no tiene una IP fija para agregar a la lista.
