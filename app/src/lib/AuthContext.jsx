import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback
} from "react";
import { syncAuth } from "@/lib/syncAuth";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);
  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      if (!syncAuth.getToken()) {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(null);
        return;
      }
      const result = await syncAuth.me();
      const currentUser = result.user;
      if (!currentUser?.email) {
        throw new Error("Invalid user response");
      }
      setUser(currentUser);
      setIsAuthenticated(true);
      setAuthError(null);
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        syncAuth.clearToken();
      }
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({
        type: "auth_required",
        message: error.message
      });
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);
  useEffect(() => {
    checkUserAuth();
  }, [checkUserAuth]);
  const logout = async (shouldRedirect = true) => {
    try {
      await syncAuth.logout();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError(null);
      if (shouldRedirect) {
        window.location.replace("/login");
      }
    }
  };
  const navigateToLogin = () => {
    window.location.replace("/login");
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError,
        appPublicSettings: { public_settings: {} },
        authChecked,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState: checkUserAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
