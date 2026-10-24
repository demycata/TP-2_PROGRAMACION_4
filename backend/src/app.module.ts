import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module.js';
import { AuthenticationModule } from '@nestjs/authentication';
import { UsuariosModule } from './usuarios/usuarios.module.js';
import { PublicacionesModule } from './publicaciones/publicaciones.module.js';

@Module({
  imports: [
    ConfigModule.forRoot(),
    AuthenticationModule.forRoot({
      globalGuard: false,}),
    MongooseModule.forRoot(process.env.MONGODB_URI!),
    AuthModule,
    UsuariosModule,
    PublicacionesModule,
  ],
})
export class AppModule {}
