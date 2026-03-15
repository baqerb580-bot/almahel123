import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Wrench, DollarSign, Smartphone, Users } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, formData);
      
      toast.success("تم تسجيل الدخول بنجاح");
      onLogin(response.data.token, response.data.user);
    } catch (error) {
      toast.error(error.response?.data?.detail || "خطأ في تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="max-w-5xl w-full">
        {/* Systems Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 text-center shadow-2xl hover:scale-105 transition-transform">
            <Wrench size={48} className="mx-auto mb-3 text-purple-600" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">نظام المهام</h3>
            <p className="text-gray-600 text-sm">إدارة مهام الصيانة والموظفين</p>
          </div>
          
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 text-center shadow-2xl hover:scale-105 transition-transform">
            <DollarSign size={48} className="mx-auto mb-3 text-pink-600" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">نظام الديون</h3>
            <p className="text-gray-600 text-sm">إدارة ديون المبيعات والتحصيل</p>
          </div>
          
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 text-center shadow-2xl hover:scale-105 transition-transform">
            <Smartphone size={48} className="mx-auto mb-3 text-indigo-600" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">صيانة الهواتف</h3>
            <p className="text-gray-600 text-sm">إدارة صيانة وقطع الهواتف</p>
          </div>
          
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 text-center shadow-2xl hover:scale-105 transition-transform">
            <Users size={48} className="mx-auto mb-3 text-green-600" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">محاسبة الوكلاء</h3>
            <p className="text-gray-600 text-sm">إدارة الوكلاء والمشتركين</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-md max-w-md mx-auto rounded-2xl shadow-2xl p-8" data-testid="login-page">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#667eea', fontFamily: 'Cairo, sans-serif' }}>
              تسجيل الدخول
            </h1>
            <p className="text-gray-600">أدخل بياناتك للدخول إلى النظام</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="login-form">
            <div>
              <label className="block text-gray-700 font-medium mb-2">اسم المستخدم</label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-500 transition-all"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                data-testid="username-input"
                placeholder="أدخل اسم المستخدم"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">كلمة المرور</label>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-500 transition-all"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                data-testid="password-input"
                placeholder="••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-lg hover:shadow-xl transition-all font-bold text-lg"
              disabled={loading}
              data-testid="submit-button"
            >
              {loading ? "جاري الدخول..." : "تسجيل الدخول"}
            </button>
          </form>

          {/* Quick Login Hints */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center mb-2">💡 الحسابات الافتراضية:</p>
            <div className="space-y-1 text-xs text-gray-500 text-center">
              <p>📋 المهام: <strong>admin</strong></p>
              <p>💰 الديون: <strong>gzbm</strong></p>
              <p>📱 الهواتف: <strong>baqerr</strong></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
