import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../../shared/constants/routes";
import { authApi } from "../api/authApi";
import { LoginRequest } from "../types";
import { useAuth } from "./useAuth";

export const useLogin = () => {
  const auth = useAuth();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: LoginRequest) => authApi.login(payload),
    onSuccess: (response) => {
      auth.completeLogin(response);
      navigate(ROUTES.home, { replace: true });
    }
  });
};
