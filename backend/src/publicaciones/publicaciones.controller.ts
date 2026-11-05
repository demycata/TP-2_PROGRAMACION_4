import {
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
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PublicacionesService } from './publicaciones.service.js';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto.js';
import { ListarPublicacionesDto } from './dto/listar-publicaciones.dto.js';
import { IdPublicacionDto } from './dto/id-publicacion.dto.js';
import { AuthGuard, UsuarioToken } from '../guards/auth/auth.guard.js';

@Controller('publicaciones')
@UseGuards(AuthGuard) //guard para proteger todas las rutas de este controlador
export class PublicacionesController {
  constructor(private readonly publicacionesService: PublicacionesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('imagen'))
  crear(
    @Body() crearPublicacionDto: CrearPublicacionDto,
    @Req() req: { user: UsuarioToken },
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
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
      }),
    )
    imagen?: Express.Multer.File,
  ) {
    return this.publicacionesService.crear(crearPublicacionDto, req.user.sub, imagen);
  }

  //se pasa el req.user.sub que es el id del user en la base

  @Get()
  listar(@Query() listarPublicacionesDto: ListarPublicacionesDto, @Req() req: { user: UsuarioToken }) {
    return this.publicacionesService.listar(listarPublicacionesDto, req.user.sub);
  }

  // va antes de :id, si no "actividad" se toma como un id
  @Get('actividad')
  actividad(@Req() req: { user: UsuarioToken }) {
    return this.publicacionesService.actividad(req.user.sub);
  }

  @Get(':id') //obtener una publicación por id
  obtener(@Param() { id }: IdPublicacionDto, @Req() req: { user: UsuarioToken }) {
    return this.publicacionesService.obtener(id, req.user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param() { id }: IdPublicacionDto, @Req() req: { user: UsuarioToken }) {
    return this.publicacionesService.eliminar(id, req.user);
  }

  @Post(':id/me-gusta')
  darMeGusta(@Param() { id }: IdPublicacionDto, @Req() req: { user: UsuarioToken }) {
    return this.publicacionesService.darMeGusta(id, req.user.sub);
  }

  @Delete(':id/me-gusta')
  quitarMeGusta(@Param() { id }: IdPublicacionDto, @Req() req: { user: UsuarioToken }) {
    return this.publicacionesService.quitarMeGusta(id, req.user.sub);
  }
}
