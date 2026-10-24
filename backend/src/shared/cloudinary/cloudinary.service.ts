import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  subirImagen(archivo: Express.Multer.File, carpeta: string): Promise<string> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: `commit/${carpeta}` }, (error, resultado) => {
          if (error || !resultado) {
            return reject(new InternalServerErrorException('No se pudo guardar la imagen'));
          }
          resolve(resultado.secure_url);
        })
        .end(archivo.buffer);
    });
  }
}
