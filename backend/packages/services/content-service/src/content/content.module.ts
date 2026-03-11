import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';

@Module({
  imports: [HttpModule],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
