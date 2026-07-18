import { apiClient } from "../../../shared/api/apiClient";
import { RegisterPushTokenRequest, SendNotificationRequest } from "../types";

export const notificationApi = {
  sendNotification(payload: SendNotificationRequest) {
    return apiClient.post<string>("/notifications/send", payload);
  },
  registerPushToken(_payload: RegisterPushTokenRequest): Promise<never> {
    // TODO: backend_context.md says UserPushToken exists, but no public registration API exists.
    return Promise.reject(new Error("Push token registration API is not implemented by the backend."));
  }
};
