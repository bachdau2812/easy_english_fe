interface AuthIconProps {
  name:
    | "book"
    | "calendar"
    | "chart"
    | "ear"
    | "eye"
    | "eyeOff"
    | "lock"
    | "mail"
    | "spark"
    | "target"
    | "user";
}

export const AuthIcon = ({ name }: AuthIconProps) => {
  const commonProps = {
    "aria-hidden": true,
    className: "auth-icon",
    fill: "none",
    height: 20,
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
    width: 20
  };

  const paths: Record<AuthIconProps["name"], JSX.Element> = {
    book: (
      <>
        <path d="M4 19.5V5.8A2.8 2.8 0 0 1 6.8 3H20v16H6.8A2.8 2.8 0 0 0 4 21.8" />
        <path d="M8 7h8" />
        <path d="M8 11h6" />
      </>
    ),
    calendar: (
      <>
        <path d="M7 2v4" />
        <path d="M17 2v4" />
        <rect height="16" rx="2" width="18" x="3" y="4" />
        <path d="M3 10h18" />
        <path d="M8 15h.01" />
        <path d="M12 15h.01" />
        <path d="M16 15h.01" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="m7 15 4-4 3 3 5-7" />
      </>
    ),
    ear: (
      <>
        <path d="M6 8a6 6 0 1 1 10.6 3.8c-1.4 1.5-2.1 2.4-2.1 4.2A3.5 3.5 0 0 1 11 19.5" />
        <path d="M8.5 8a3.5 3.5 0 1 1 6.3 2.1" />
        <path d="M11 22a2 2 0 0 0 2-2" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    eyeOff: (
      <>
        <path d="m3 3 18 18" />
        <path d="M10.6 10.6A3 3 0 0 0 13.4 13.4" />
        <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3 4" />
        <path d="M6.2 6.8C3.5 8.6 2 12 2 12s3.5 7 10 7a10.7 10.7 0 0 0 4-0.8" />
      </>
    ),
    lock: (
      <>
        <rect height="11" rx="2" width="16" x="4" y="11" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
    mail: (
      <>
        <rect height="16" rx="2" width="20" x="2" y="4" />
        <path d="m22 7-10 7L2 7" />
      </>
    ),
    spark: (
      <>
        <path d="M12 2 9.6 8.8 3 11.2l6.6 2.4L12 20l2.4-6.4 6.6-2.4-6.6-2.4L12 2Z" />
        <path d="m5 3 1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21a7 7 0 0 1 14 0" />
      </>
    )
  };

  return <svg {...commonProps}>{paths[name]}</svg>;
};
