import { IsString, IsEnum, IsOptional, IsObject, IsNumber } from 'class-validator';
import { HotelType, HotelTier, HotelTheme, PricingMode } from '@prisma/client';

export class CreateHotelDto {
  @IsString()
  name: string;

  @IsEnum(HotelType)
  type: HotelType;

  @IsEnum(HotelTier)
  tier: HotelTier;

  @IsEnum(HotelTheme)
  theme: HotelTheme;

  @IsString()
  city: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsObject()
  @IsOptional()
  coordinates?: { lat: number; lng: number };

  @IsEnum(PricingMode)
  @IsOptional()
  defaultMode?: PricingMode;

  @IsString()
  @IsOptional()
  scriptStrategy?: string;

  @IsNumber()
  @IsOptional()
  flexibleInventoryRate?: number;
}
