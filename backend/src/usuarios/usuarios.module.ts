import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Usuario, UsuarioSchema } from './entities/usuario.entity.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Usuario.name, schema: UsuarioSchema }])],
  exports: [MongooseModule],
})
export class UsuariosModule {}
