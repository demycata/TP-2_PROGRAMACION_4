import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { EstadisticasService } from './estadisticas.service.js';
import { LapsoDto } from './dto/lapso.dto.js';
import { AuthGuard } from '../guards/auth/auth.guard.js';
import { AdminGuard } from '../guards/admin/admin.guard.js';

// no cuelga de /publicaciones porque GET /publicaciones/:id tomaría "estadisticas" como un id
@Controller('estadisticas')
@UseGuards(AuthGuard, AdminGuard)
export class EstadisticasController {
  constructor(private readonly estadisticasService: EstadisticasService) {}

  @Get('publicaciones-por-usuario')
  publicacionesPorUsuario(@Query() lapso: LapsoDto) {
    return this.estadisticasService.publicacionesPorUsuario(lapso);
  }

  @Get('comentarios')
  comentarios(@Query() lapso: LapsoDto) {
    return this.estadisticasService.comentarios(lapso);
  }

  @Get('comentarios-por-publicacion')
  comentariosPorPublicacion(@Query() lapso: LapsoDto) {
    return this.estadisticasService.comentariosPorPublicacion(lapso);
  }
}
