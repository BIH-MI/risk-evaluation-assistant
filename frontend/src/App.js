// src/App.jsx
import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";

import Configurator from "components/input/Configurator";
import Sidenav from "components/navigation/Sidenav";
import DashboardLayout from "components/layout/LayoutContainers/DashboardLayout";
import DashboardNavbar from "components/navigation/Navbars/DashboardNavbar";

import logo from "assets/images/favicon.png";
import theme from "assets/theme";
import themeDark from "assets/theme-dark";
import AuthenticationGuard from "components/authentication";
import LoginRedirect from "components/authentication/LoginRedirect";

import { setMiniSidenav, useMaterialUIController } from "context";
import routes from "routes.js";
import { useAuth } from "react-oidc-context";
import { isAdminUser } from "utils/auth";

function flattenRoutes(routeItems) {
    return routeItems.flatMap((route) => [
        route,
        ...(route.collapse ? flattenRoutes(route.collapse) : []),
    ]);
}

export default function App() {
    const [controller, materialDispatch] = useMaterialUIController();
    const {
        miniSidenav,
        sidenavColor,
        darkMode,
    } = controller;

    const [onMouseEnter, setOnMouseEnter] = useState(false);
    const { pathname } = useLocation();
    const { user } = useAuth();
    const isAdmin = isAdminUser(user);
    const flatRoutes = flattenRoutes(routes);

    // Reset scroll on route change
    useEffect(() => {
        document.documentElement.scrollTop = 0;
        document.scrollingElement.scrollTop = 0;
    }, [pathname]);

    // Auto-expand / collapse mini sidenav on hover
    const handleOnMouseEnter = () => {
        if (miniSidenav && !onMouseEnter) {
            setMiniSidenav(materialDispatch, false);
            setOnMouseEnter(true);
        }
    };
    const handleOnMouseLeave = () => {
        if (onMouseEnter) {
            setMiniSidenav(materialDispatch, true);
            setOnMouseEnter(false);
        }
    };

    return (
        <ThemeProvider theme={darkMode ? themeDark : theme}>
            <CssBaseline />

            <Routes>
                <Route path="/init" element={<LoginRedirect />} />
                <Route
                    path="/*"
                    element={
                        <AuthenticationGuard>
                            <Sidenav
                                color={sidenavColor}
                                brand={logo}
                                brandName="Risk Evaluation Assistant"
                                onMouseEnter={handleOnMouseEnter}
                                onMouseLeave={handleOnMouseLeave}
                                routes={routes}
                            />
                            <Configurator />

                            <Routes>                                
                                {flatRoutes
                                    .filter(({ route, component }) => route && component)
                                    .map(({ key, route, component, adminOnly }) => (
                                        <Route
                                            key={key}
                                            path={route}
                                            element={
                                                <DashboardLayout>
                                                    <DashboardNavbar />
                                                    {adminOnly && !isAdmin ? (
                                                        <Navigate to="/datasets" replace />
                                                    ) : (
                                                        component
                                                    )}
                                                </DashboardLayout>
                                            }
                                        />
                                    ))}

                                {/* Fallback to /datasets */}
                                <Route
                                    path="*"
                                    element={
                                        <DashboardLayout>
                                            <DashboardNavbar />
                                            <Navigate to="/datasets" replace />
                                        </DashboardLayout>
                                    }
                                />
                            </Routes>
                        </AuthenticationGuard>
                    }
                />
            </Routes>
        </ThemeProvider>
    );
}
