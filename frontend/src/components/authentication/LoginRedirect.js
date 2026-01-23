import { useEffect } from "react";
import { useAuth } from "react-oidc-context";

const LoginRedirect = () => {
  const auth = useAuth();

  console.log("<LoginRedirect /> mounted");
  
  useEffect(() => {
    console.log("Calling signinRedirect()");
    auth.signinRedirect();
  }, []);

  // Return null to render nothing (blank screen) while redirecting
  return null;
};

export default LoginRedirect;