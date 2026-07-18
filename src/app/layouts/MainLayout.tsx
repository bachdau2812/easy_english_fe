import { NavLink, Outlet } from "react-router-dom";
import { Button } from "../../shared/components/Button";
import { ROUTES } from "../../shared/constants/routes";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { useLogout } from "../../features/auth/hooks/useLogout";

const navItems = [
  { label: "Dashboard", to: ROUTES.dashboard },
  { label: "Search", to: ROUTES.search },
  { label: "Saved", to: ROUTES.vocabularies },
  { label: "Review", to: ROUTES.review },
  { label: "Listening", to: ROUTES.listening },
  { label: "Statistics", to: ROUTES.statistics },
  { label: "Profile", to: ROUTES.profile }
];

export const MainLayout = () => {
  const { username } = useAuth();
  const logout = useLogout();

  return (
    <div className="main-layout">
      <aside className="sidebar">
        <p className="sidebar__brand">Vocab App</p>
        <nav className="sidebar__nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
              }
              key={item.to}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div>
        <header className="topbar">
          <span>{username ?? "Learner"}</span>
          <Button isLoading={logout.isPending} onClick={() => logout.mutate()} variant="secondary">
            Log out
          </Button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
