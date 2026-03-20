import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Lock, Save, X, Eye, EyeOff, MessageCircle } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Settings = ({ user, onClose }) => {
  const [passwordData, setPasswordData] = useState({
    old_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [telegramId, setTelegramId] = useState(user.telegram_chat_id || "");
  const [loading, setLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error("الرمز الجديد غير متطابق");
      return;
    }

    if (passwordData.new_password.length < 4) {
      toast.error("الرمز الجديد يجب أن يكون 4 أحرف على الأقل");
      return;
    }

    setLoading(true);

    try {
      await axios.post(
        `${API}/auth/change-password`,
        {
          old_password: passwordData.old_password,
          new_password: passwordData.new_password
        },
        getAuthHeaders()
      );

      toast.success("✓ تم تغيير الرمز بنجاح");
      setPasswordData({
        old_password: "",
        new_password: "",
        confirm_password: ""
      });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل تغيير الرمز");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTelegramId = async () => {
    setLoading(true);
    
    try {
      await axios.patch(
        `${API}/users/${user.id}/telegram`,
        { telegram_chat_id: telegramId },
        getAuthHeaders()
      );
      
      toast.success("✓ تم تحديث Telegram ID بنجاح");
      
      // تحديث البيانات المحلية
      const updatedUser = { ...user, telegram_chat_id: telegramId };
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (error) {
      toast.error("فشل تحديث Telegram ID");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="settings-modal">
      <div className="card max-w-lg w-full">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Lock className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold" style={{ color: '#667eea' }}>الإعدادات</h2>
              <p className="text-sm text-gray-600">{user.name} ({user.role === "admin" ? "مدير" : "موظف"})</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={28} />
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 mt-1">ℹ️</div>
            <div>
              <p className="text-sm text-blue-800 font-medium mb-1">معلومات حسابك</p>
              <p className="text-xs text-blue-700">البريد: {user.email}</p>
              <p className="text-xs text-blue-700 mt-1">
                يمكنك تغيير الرمز السري من هنا. احفظ الرمز الجديد في مكان آمن.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-5">
          {/* Telegram ID Section */}
          {user.role === 'admin' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="text-purple-600" size={20} />
                <h3 className="font-bold text-purple-800">Telegram ID للإشعارات</h3>
              </div>
              <p className="text-xs text-purple-700 mb-3">
                أضف Telegram Chat ID الخاص بك لتلقي جميع إشعارات النظام
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-field flex-1"
                  value={telegramId}
                  onChange={(e) => setTelegramId(e.target.value)}
                  placeholder="مثال: 123456789"
                />
                <button
                  type="button"
                  onClick={handleUpdateTelegramId}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-all"
                  disabled={loading}
                >
                  حفظ
                </button>
              </div>
              <div className="bg-white border border-purple-200 rounded-lg p-3 mt-3">
                <p className="text-xs text-purple-800 font-bold mb-2">📱 كيفية الحصول على Chat ID:</p>
                <ol className="text-xs text-purple-700 space-y-1 mr-4">
                  <li>1. افتح Telegram وابحث عن: <strong>@userinfobot</strong></li>
                  <li>2. اضغط Start</li>
                  <li>3. سيرسل لك Chat ID الخاص بك</li>
                </ol>
              </div>
            </div>
          )}

          <div>
            <label className="label">الرمز الحالي</label>
            <div className="relative">
              <input
                type={showOldPassword ? "text" : "password"}
                className="input-field pr-12"
                value={passwordData.old_password}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, old_password: e.target.value })
                }
                required
                placeholder="أدخل الرمز الحالي"
                data-testid="old-password-input"
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showOldPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">الرمز الجديد</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                className="input-field pr-12"
                value={passwordData.new_password}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, new_password: e.target.value })
                }
                required
                placeholder="أدخل الرمز الجديد"
                data-testid="new-password-input"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">تأكيد الرمز الجديد</label>
            <input
              type="password"
              className="input-field"
              value={passwordData.confirm_password}
              onChange={(e) =>
                setPasswordData({ ...passwordData, confirm_password: e.target.value })
              }
              required
              placeholder="أعد كتابة الرمز الجديد"
              data-testid="confirm-password-input"
            />
            {passwordData.new_password &&
              passwordData.confirm_password &&
              passwordData.new_password !== passwordData.confirm_password && (
                <p className="text-xs text-red-500 mt-1">⚠️ الرموز غير متطابقة</p>
              )}
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              className="success-button flex-1"
              disabled={loading}
              data-testid="save-password-button"
            >
              <Save className="inline ml-2" size={18} />
              {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="secondary-button flex-1"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
