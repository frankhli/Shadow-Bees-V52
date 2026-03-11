import { IsString, IsNumber, IsOptional, IsObject } from 'class-validator';

export class CreateRoomTypeDto {
  @IsString()
  hotelId: string;

  @IsString()
  name: string;

  @IsNumber()
  floorPrice: number;

  @IsNumber()
  ceilingPrice: number;

  @IsNumber()
  @IsOptional()
  currentPrice?: number;

  @IsNumber()
  totalInventory: number;

  @IsNumber()
  otaAllocation: number;

  @IsNumber()
  flexibleAllocation: number;

  @IsObject()
  @IsOptional()
  attributes?: Record<string, any>;
}
