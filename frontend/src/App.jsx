import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import { Loading, EmptyState, ErrorNotice } from "./components/UI";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Predict = lazy(() => import("./pages/Predict"));
const Batch = lazy(() => import("./pages/Batch"));
const History = lazy(() => import("./pages/History"));
const ModelInfo = lazy(() => import("./pages/ModelInfo"));
const Profile = lazy(() => import("./pages/Profile"));

function Protected() {
  const { user, loading, connectionError } = useAuth();
  if (loading) return <Loading />;
  if (connectionError)
    return (
      <div className="auth-unavailable">
        <ErrorNotice
          message="The API is unavailable. Start the Django server, then reload this page."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  return user ? <Layout /> : <Navigate to="/login" replace />;
}

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth register />} />
          <Route path="/app" element={<Protected />}>
            <Route index element={<Dashboard />} />
            <Route path="predict" element={<Predict />} />
            <Route path="batch" element={<Batch />} />
            <Route path="history" element={<History />} />
            <Route path="model" element={<ModelInfo />} />
            <Route path="profile" element={<Profile />} />
            <Route
              path="*"
              element={
                <EmptyState
                  title="Page not found"
                  description="Use the workspace navigation to find your next insight."
                />
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
