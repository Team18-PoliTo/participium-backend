import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
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
  @IsEmail({}, { message: "Invalid email format" })
  newEmail?: string;
  @IsString()
  newFirstName?: string;
  @IsString()
  newLastName?: string;
}
