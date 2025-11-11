import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsInt,
  Min,
  ValidateNested,
} from "class-validator";
import { BinaryFileDTO } from "./ReportDTO";
import { Type } from "class-transformer";

export class RegisterCitizenRequestDTO {
  @IsEmail({}, { message: "Invalid email format" })
  @IsNotEmpty({ message: "Email is required" })
  email: string;

  @IsString()
  @IsNotEmpty({ message: "Username is required" })
  @MinLength(3, { message: "Username must be at least 3 characters long" })
  username: string;

  @IsString()
  @IsNotEmpty({ message: "First name is required" })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: "Last name is required" })
  lastName: string;

  @IsString()
  @IsNotEmpty({ message: "Password is required" })
  @MinLength(6, { message: "Password must be at least 6 characters long" })
  password: string;
}

export class RegisterInternalUserRequestDTO {
  @IsEmail({}, { message: "Invalid email format" })
  @IsNotEmpty({ message: "Email is required" })
  email: string;

  @IsString()
  @IsNotEmpty({ message: "First name is required" })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: "Last name is required" })
  lastName: string;

  @IsString()
  @IsNotEmpty({ message: "Password is required" })
  @MinLength(6, { message: "Password must be at least 6 characters long" })
  password: string;
}

export class UpdateInternalUserRequestDTO {
  @IsOptional()
  @IsEmail({}, { message: "Invalid email format" })
  newEmail?: string;
  @IsOptional()
  @IsString()
  newFirstName?: string;
  @IsOptional()
  @IsString()
  newLastName?: string;
  @IsOptional()
  @IsInt({ message: "newRoleId must be a number" })
  @Min(0)
  newRoleId?: number;
}

export class CreateReportRequestDTO {
  @IsString()
  @IsNotEmpty({ message: "Title is required" })
  title: string;
  
  @IsString()
  @IsNotEmpty({ message: "Description is required" })
  description: string;
  
  @IsInt({ message: "citizenId must be a number" })
  @Min(1)
  citizenId: number;

  @IsString()
  @IsNotEmpty({ message: "Category is required" })
  category: string;

  @ValidateNested()
  @Type(() => BinaryFileDTO)
  @IsNotEmpty({ message: "At least one photo is required" })
  binaryPhoto1: BinaryFileDTO;

  @ValidateNested()
  @Type(() => BinaryFileDTO)
  @IsOptional()
  binaryPhoto2?: BinaryFileDTO;

  @ValidateNested()
  @Type(() => BinaryFileDTO)
  @IsOptional()
  binaryPhoto3?: BinaryFileDTO;

  @IsNotEmpty({ message: "Location is required" })
  location: {
    latitude: number;
    longitude: number;
  };
}
