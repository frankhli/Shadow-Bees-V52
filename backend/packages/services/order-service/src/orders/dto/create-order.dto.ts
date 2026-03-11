import { IsString, IsNumber, IsEnum, IsDateString, IsOptional, Min } from 'class-validator';
import { Platform, InventorySource } from '@prisma/client';

export class CreateOrderDto {
  @IsString()
  hotelId: string;

  @IsString()
  roomTypeId: string;

  @IsEnum(Platform)
  platform: Platform;

  @IsString()
  @IsOptional()
  sourceContentId?: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsDateString()
  checkInDate: string;

  @IsDateString()
  checkOutDate: string;

  @IsNumber()
  @Min(1)
  nights: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsEnum(InventorySource)
  inventorySource: InventorySource;
}
