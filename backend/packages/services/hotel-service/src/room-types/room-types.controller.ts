import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RoomTypesService } from './room-types.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';

@Controller('room-types')
export class RoomTypesController {
  constructor(private readonly roomTypesService: RoomTypesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createRoomTypeDto: CreateRoomTypeDto) {
    return this.roomTypesService.create(createRoomTypeDto);
  }

  @Get()
  findAll(@Query('hotelId') hotelId?: string) {
    return this.roomTypesService.findAll(hotelId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomTypesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRoomTypeDto: UpdateRoomTypeDto) {
    return this.roomTypesService.update(id, updateRoomTypeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.roomTypesService.remove(id);
  }
}
