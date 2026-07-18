import { EmptyState } from "../../../shared/components/EmptyState";

export const NotificationPermission = () => (
  <EmptyState
    description="Browser permission UI can be connected after the backend exposes push token registration."
    title="Push notifications unavailable"
  />
);
