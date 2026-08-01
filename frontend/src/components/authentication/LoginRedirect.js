import { useEffect } from "react";
import { useAuth } from "react-oidc-context";

const LoginRedirect = () => {
  const { activeNavigator, isLoading, signinRedirect } = useAuth();

  useEffect(() => {
    if (!isLoading && !activeNavigator) {
      signinRedirect();
    }
  }, [activeNavigator, isLoading, signinRedirect]);

  // Return null to render nothing (blank screen) while redirecting
  return null;
};

export default LoginRedirect;
