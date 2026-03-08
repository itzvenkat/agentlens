import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '@itzvenkat0/agentlens-common';
import { ApiKeyGuard } from './api-key.guard';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Global()
@Module({
    imports: [TypeOrmModule.forFeature([Project])],
    controllers: [AuthController],
    providers: [ApiKeyGuard, AuthService],
    exports: [ApiKeyGuard, AuthService],
})
export class AuthModule { }
