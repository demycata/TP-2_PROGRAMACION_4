import {
  BadRequestException,
  Body,
  Controller,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service.js';
import { RegistroDto } from './dto/registro.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('registro')
  @UseInterceptors(FileInterceptor('imagenPerfil'))
  registro(
    @Body() registroDto: RegistroDto,
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
    return this.authService.registro(registroDto, imagen);
  }
}
