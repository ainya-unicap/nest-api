import { Module } from '@nestjs/common';
import { ChecklistController } from './checklist.controller';

@Module({
  controllers: [ChecklistController],
})
export class ChecklistModule {}
