import { Module } from '@nestjs/common';
import { PhotosController } from './photos.controller';
import { PhotoService } from '../../services/photo.service';

@Module({
  controllers: [PhotosController],
  providers: [PhotoService],
  exports: [PhotoService],
})
export class PhotosModule {}
