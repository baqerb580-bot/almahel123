import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import TechnicianDashboard from "./pages/TechnicianDashboard";
import DebtsSystemFinal from "./pages/DebtsSystemFinal";
import PhoneRepairSystemFull from "./pages/PhoneRepairSystemFull";
import AgentsSystem from "./pages/AgentsSystem";
import { Toaster } from "sonner";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="text-lg text-white font-bold">جاري التحميل...</div>
      </div>
    );
  }

  const renderDashboard = () => {
    if (!user) return <Navigate to="/login" replace />;

    // نظام المهام (الأصلي)
    if (user.system === "tasks") {
      return user.role === "admin" ? (
        <AdminDashboard user={user} onLogout={handleLogout} />
      ) : (
        <TechnicianDashboard user={user} onLogout={handleLogout} />
      );
    }

    // نظام الديون
    if (user.system === "debts") {
      return <DebtsSystemFinal user={user} onLogout={handleLogout} />;
    }

    // نظام صيانة الهواتف
    if (user.system === "phones") {
      return <PhoneRepairSystemFull user={user} onLogout={handleLogout} />;
    }

    // نظام محاسبة الوكلاء
    if (user.system === "agents") {
      return <AgentsSystem user={user} onLogout={handleLogout} />;
    }

    return <Navigate to="/login" replace />;
  };

  return (
    <div className="App">
      <Toaster position="top-center" richColors />
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              !user ? (
                <Login onLogin={handleLogin} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/"
            element={renderDashboard()}
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
