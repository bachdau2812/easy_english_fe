import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../shared/constants/routes";
import { authApi } from "../api/authApi";
import { useAuth } from "./useAuth";

export const useLogout = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      auth.token ? authApi.logout({ token: auth.token }) : Promise.resolve("Already logged out"),
    onSettled: () => {
      auth.clearSession();
      queryClient.clear();
      navigate(ROUTES.login, { replace: true });
    }
  });
};
