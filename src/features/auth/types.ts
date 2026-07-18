import { ISODateString, UUID } from "../../shared/types/common";

export interface AuthenticationResponse {
  token?: string | null;
  userId?: UUID | null;
  username?: string | null;
}

export interface UserInfoResponse {
  id?: UUID | null;
  username?: string | null;
  email?: string | null;
  userRole?: string | null;
  createdAt?: ISODateString | null;
  updatedAt?: ISODateString | null;
}

export interface RegisterUserRequest {
  username: string;
  password: string;
  email: string;
  userRole?: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface LogoutRequest {
  token: string;
}

export interface RefreshTokenRequest {
  token: string;
}

export interface ResetPasswordRequest {
  userId: UUID;
  oldPassword: string;
  newPassword: string;
}

export interface ForgetPasswordRequest {
  email: string;
}

export interface UpdateUserInfoRequest {
  userId: UUID;
  username: string;
}
