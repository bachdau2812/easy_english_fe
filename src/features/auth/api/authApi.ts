import { apiClient } from "../../../shared/api/apiClient";
import {
  AuthenticationResponse,
  ForgetPasswordRequest,
  LoginRequest,
  LogoutRequest,
  RefreshTokenRequest,
  RegisterUserRequest,
  ResetPasswordRequest,
  UpdateUserInfoRequest,
  UserInfoResponse,
  VerifyEmailRequest
} from "../types";

export const authApi = {
  register(payload: RegisterUserRequest) {
    return apiClient.post<string>("/auth/register", payload, { auth: false });
  },
  verifyEmail(payload: VerifyEmailRequest) {
    return apiClient.post<UserInfoResponse>("/auth/verify-email", payload, { auth: false });
  },
  login(payload: LoginRequest) {
    return apiClient.post<AuthenticationResponse>("/auth/login", payload, { auth: false });
  },
  logout(payload: LogoutRequest) {
    return apiClient.post<string>("/auth/logout", payload, { auth: false });
  },
  refreshToken(payload: RefreshTokenRequest) {
    return apiClient.post<AuthenticationResponse>("/auth/refresh-token", payload, { auth: false });
  },
  resetPassword(payload: ResetPasswordRequest) {
    return apiClient.post<string>("/auth/reset-password", payload);
  },
  forgotPassword(payload: ForgetPasswordRequest) {
    return apiClient.post<string>("/auth/forgot-password", payload, { auth: false });
  },
  submitForgotPasswordCode(payload: VerifyEmailRequest) {
    return apiClient.post<string>("/auth/forgot-password/submit-code", payload, { auth: false });
  },
  completeForgotPasswordWithNewPassword(): Promise<never> {
    // TODO: backend_context.md documents `/auth/forgot-password/submit-code` as
    // emailing a generated password. No public endpoint currently accepts a
    // user-chosen new password after code verification.
    return Promise.reject(
      new Error("Setting a chosen new password is not supported by the current backend API.")
    );
  },
  getUserInfo(userId: string) {
    return apiClient.get<UserInfoResponse>("/users/info", { query: { userId } });
  },
  updateUserInfo(payload: UpdateUserInfoRequest) {
    return apiClient.put<UserInfoResponse>("/users/info", payload);
  }
};
