import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger:
            process.env.NODE_ENV === 'production'
                ? ['error', 'warn', 'log']
                : ['error', 'warn', 'log', 'debug'],
    });

    const config = app.get(ConfigService);
    const port = config.get<number>('app.port', 9471);
    const corsOrigins = config.get<string[]>('app.corsOrigins', [
        'http://localhost:9472',
    ]);

    app.use(helmet());
    app.enableCors({
        origin: corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'X-API-Key', 'X-Master-Key', 'Authorization'],
    });
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }),
    );
    app.enableShutdownHooks();

    await app.listen(port);

    Logger.log(
        `AgentLens API ready → http://localhost:${port}`,
        'Bootstrap',
    );
}

bootstrap();
