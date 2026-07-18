import { JsonObject } from "../../shared/types/common";

export type NotificationMethod = "EMAIL" | "PUSH";

export interface SendNotificationRequest {
  recipientId: string;
  title: string;
  notificationMethod: NotificationMethod;
  notificationType: string;
  metadata: JsonObject;
}

export interface RegisterPushTokenRequest {
  deviceName: string;
  token: string;
  userId: string;
}
