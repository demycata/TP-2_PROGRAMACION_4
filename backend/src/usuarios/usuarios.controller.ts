import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsuariosService } from './usuarios.service.js';
import { CrearUsuarioDto } from './dto/crear-usuario.dto.js';
import { IdUsuarioDto } from './dto/id-usuario.dto.js';
import { AuthGuard, UsuarioToken } from '../guards/auth/auth.guard.js';
import { AdminGuard } from '../guards/admin/admin.guard.js';

@Controller('usuarios')
@UseGuards(AuthGuard, AdminGuard) //el orden importa: AuthGuard deja el usuario en req.user y AdminGuard lo lee
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  listar() {
    return this.usuariosService.listar();
  }

  @Post()
  @UseInterceptors(FileInterceptor('imagenPerfil'))
  alta(
    @Body() crearUsuarioDto: CrearUsuarioDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 2 * 1024 * 1024,
            errorMessage: 'La imagen no puede superar los 2 MB',
          }),
          new FileTypeValidator({
            fileType: /^image\/(jpeg|png|webp)$/,
            errorMessage: 'La imagen debe ser JPG, PNG o WEBP',
          }),
        ],
        exceptionFactory: (error) =>
          new BadRequestException(
            error === 'File is required' ? 'La imagen de perfil es obligatoria' : error,
          ),
      }),
    )
    imagen: Express.Multer.File,
  ) {
    return this.usuariosService.alta(crearUsuarioDto, imagen);
  }

  @Delete(':id')
  deshabilitar(@Param() { id }: IdUsuarioDto, @Req() req: { user: UsuarioToken }) {
    return this.usuariosService.deshabilitar(id, req.user.sub);
  }

  @Post(':id/habilitar')
  @HttpCode(HttpStatus.OK)
  habilitar(@Param() { id }: IdUsuarioDto) {
    return this.usuariosService.habilitar(id);
  }
}
