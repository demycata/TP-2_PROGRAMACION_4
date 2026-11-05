import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { CloudinaryModule } from '../shared/cloudinary/cloudinary.module.js';

@Module({
  imports: [
    // este módulo se carga antes que AppModule: sin esto, JWT_SECRET todavía no está en process.env
    ConfigModule.forRoot(),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '90s' },
    }),
    UsuariosModule,
    CloudinaryModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
