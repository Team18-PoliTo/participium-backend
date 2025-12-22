import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsInt,
  Min,
  IsObject,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
} from "class-validator";

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
  @IsOptional()
  @IsInt({ message: "newCompanyId must be a number" })
  @Min(0)
  newCompanyId?: number;
}

export class CreateReportRequestDTO {
  @IsString({ message: "Title must be a string" })
  @IsNotEmpty({ message: "Title is required" })
  title: string;

  @IsString({ message: "Description must be a string" })
  @IsNotEmpty({ message: "Description is required" })
  description: string;

  @IsInt({ message: "Category ID must be a number" })
  @IsNotEmpty({ message: "Category is required" })
  categoryId: number;

  @IsArray({ message: "Photo IDs must be an array" })
  @ArrayMinSize(1, { message: "At least one photo is required" })
  @ArrayMaxSize(3, { message: "Maximum 3 photos allowed" })
  @IsString({ each: true, message: "Each photo ID must be a string" })
  photoIds: string[];

  @IsNotEmpty({ message: "Location is required" })
  location: {
    latitude: number;
    longitude: number;
  };
}

export class UpdateReportRequestDTO {
  @IsString({ message: "Status must be a string" })
  @IsNotEmpty({ message: "Status is required" })
  status: string;

  @IsOptional()
  @IsInt({ message: "Category ID must be a number" })
  categoryId?: number;

  @IsString({ message: "Explanation must be a string" })
  @IsNotEmpty({ message: "Explanation is required" })
  explanation: string;
}

export class DelegateReportRequestDTO {
  @IsNotEmpty()
  @IsInt({ message: "Company ID must be a number" })
  companyId: number;
}

export class GetAssignedReportsForMapRequestDTO {
  @IsNotEmpty({ message: "Corners are required" })
  @IsObject({
    each: true,
    message: "Each corner must be an object with longitude and latitude",
  })
  @IsArray({ message: "Corners must be an array" })
  corners: {
    latitude: number;
    longitude: number;
  }[];
}

export class CreateCommentRequestDTO {
  @IsString({ message: "Comment must be a string" })
  @IsNotEmpty({ message: "Comment text is required" })
  @MinLength(1, { message: "Comment cannot be empty" })
  comment: string;
}
