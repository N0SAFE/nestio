import { Module } from '@nestjs/common';
import { StorageController } from './controllers/storage.controller';
import { StorageService } from './services/storage.service';
import { StorageRepository } from './repositories/storage.repository';
import { FilesystemUtils } from './utils/filesystem.utils';
import { DatabaseModule } from '../../core/modules/database/database.module';
import { EnvModule } from '@/config/env/env.module';

@Module({
  imports: [DatabaseModule, EnvModule],
  controllers: [StorageController],
  providers: [StorageService, StorageRepository, FilesystemUtils],
  exports: [StorageService],
})
export class StorageModule {}
