import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
export default function ProtectedRoute() {
  const {
    isAuthenticated,
    isLoadingAuth,
    authChecked,
    checkUserAuth
  } = useAuth();
  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);
  if (isLoadingAuth || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Checking your SyncSpace session...
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
