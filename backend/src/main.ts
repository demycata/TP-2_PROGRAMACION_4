import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import * as dns from 'dns';

dns.setServers(['8.8.8.8', '1.1.1.1']);
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({ origin: process.env.FRONTEND_URL });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
