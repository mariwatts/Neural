import './load-env';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const port = Number(process.env.PORT ?? 4000);
  const host = process.env.HOST ?? '0.0.0.0';
  const origins = (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({ origin: origins, credentials: false });
  app.setGlobalPrefix('api');

  // Flush the persisted simulation on SIGINT/SIGTERM so nothing is lost.
  app.enableShutdownHooks();

  await app.listen(port, host);
  new Logger('Bootstrap').log(
    `NEURONS NeuralNS API listening on http://${host}:${port}/api`,
  );
}

void bootstrap();
