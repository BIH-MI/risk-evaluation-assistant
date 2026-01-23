import App from "App";
import { MaterialUIControllerProvider } from "context";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "react-oidc-context";
import { Provider as ReduxProvider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { store } from "store";

const container = document.getElementById("app");
const root = createRoot(container);

const oidcConfig = {
  authority: process.env.REACT_APP_OIDC_AUTHORITY,
  client_id: process.env.REACT_APP_OIDC_CLIENT_ID,
  redirect_uri: process.env.REACT_APP_OIDC_REDIRECT_URI,
  post_logout_redirect_uri: process.env.REACT_APP_OIDC_POST_LOGOUT_REDIRECT_URI,
  response_type: "code",
  scope: "openid profile email",
  loadUserInfo: true,
  automaticSilentRenew: false,
  monitorSession: false,
};

console.log("OIDC config:", oidcConfig);

root.render(
  <ReduxProvider store={store}>
    <AuthProvider {...oidcConfig}>
      <BrowserRouter>
        <MaterialUIControllerProvider>
          <App />
        </MaterialUIControllerProvider>
      </BrowserRouter>
    </AuthProvider>
  </ReduxProvider>
);