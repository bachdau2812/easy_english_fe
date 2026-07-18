import { useMutation } from "@tanstack/react-query";
import { notificationApi } from "../api/notificationApi";
import { RegisterPushTokenRequest } from "../types";

export const useRegisterPushToken = () =>
  useMutation({
    mutationFn: (payload: RegisterPushTokenRequest) => notificationApi.registerPushToken(payload)
  });
