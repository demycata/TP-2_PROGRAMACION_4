import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ComentariosService } from './comentarios.service.js';
import { CrearComentarioDto } from './dto/crear-comentario.dto.js';
import { ListarComentariosDto } from './dto/listar-comentarios.dto.js';
import { IdPublicacionDto } from './dto/id-publicacion.dto.js';
import { IdComentarioDto } from './dto/id-comentario.dto.js';
import { AuthGuard, UsuarioToken } from '../guards/auth/auth.guard.js';

@Controller('publicaciones/:id/comentarios')
@UseGuards(AuthGuard)
export class ComentariosController {
  constructor(private readonly comentariosService: ComentariosService) {}

  @Post()
  crear(
    @Param() { id }: IdPublicacionDto,
    @Body() crearComentarioDto: CrearComentarioDto,
    @Req() req: { user: UsuarioToken },
  ) {
    return this.comentariosService.crear(id, crearComentarioDto, req.user.sub);
  }

  @Get()
  listar(@Param() { id }: IdPublicacionDto, @Query() listarComentariosDto: ListarComentariosDto) {
    return this.comentariosService.listar(id, listarComentariosDto);
  }

  @Put(':comentarioId')
  editar(
    @Param() { id, comentarioId }: IdComentarioDto,
    @Body() editarComentarioDto: CrearComentarioDto,
    @Req() req: { user: UsuarioToken },
  ) {
    return this.comentariosService.editar(id, comentarioId, editarComentarioDto, req.user.sub);
  }

  @Delete(':comentarioId')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param() { id, comentarioId }: IdComentarioDto, @Req() req: { user: UsuarioToken }) {
    return this.comentariosService.eliminar(id, comentarioId, req.user.sub);
  }
}
