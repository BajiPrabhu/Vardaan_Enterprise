import { Routes, Route } from "react-router";
import AppLayout from "../components/layout/AppLayout";
import Dashboard from "../pages/Dashboard";
import Fleet from "../pages/Fleet";
import Devices from "../pages/Devices";
import Drivers from "../pages/Drivers";
import Monitoring from "../pages/Monitoring";
import Alerts from "../pages/Alerts";
import Login from "../pages/Login";
import ProtectedRoute from "../auth/ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/fleet" element={<Fleet />} />
        <Route path="/devices" element={<Devices />} />
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/monitoring" element={<Monitoring />} />
        <Route path="/alerts" element={<Alerts />} />
      </Route>
    </Routes>
  );
}
