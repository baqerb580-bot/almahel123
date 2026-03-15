import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Users, DollarSign, UserPlus, Settings as SettingsIcon, 
  LogOut, Trash2, Edit, MessageCircle, CreditCard, TrendingUp, Activity, FileText, X, Save
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AgentsSystem = ({ user, onLogout }) => {
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState(null);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [showEditAgent, setShowEditAgent] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAgentHistory, setShowAgentHistory] = useState(false);
  const [selectedAgentHistory, setSelectedAgentHistory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [paymentAgent, setPaymentAgent] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  
  const [newAgent, setNewAgent] = useState({
    name: "",
    phone: "",
    mastercard_number: "",
    total_subscribers: "",
    disconnected_count: ""
  });

  const [settings, setSettings] = useState({
    old_password: "",
    new_password: "",
    new_username: ""
  });

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      const [agentsRes, statsRes] = await Promise.all([
        axios.get(`${API}/agents`, getAuthHeaders()),
        axios.get(`${API}/agents/stats`, getAuthHeaders())
      ]);
      setAgents(agentsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleAddAgent = async (e) => {
    e.preventDefault();
    
    try {
      const agentData = {
        name: newAgent.name,
        phone: newAgent.phone,
        mastercard_number: newAgent.mastercard_number,
        total_subscribers: parseInt(newAgent.total_subscribers) || 0,
        disconnected_count: parseInt(newAgent.disconnected_count) || 0
      };
      
      await axios.post(`${API}/agents`, agentData, getAuthHeaders());
      toast.success("✓ تم إضافة الوكيل بنجاح");
      setShowAddAgent(false);
      setNewAgent({
        name: "",
        phone: "",
        mastercard_number: "",
        total_subscribers: "",
        disconnected_count: ""
      });
      fetchData();
    } catch (error) {
      toast.error("فشل إضافة الوكيل");
    }
  };

  const handleUpdateAgent = async (e) => {
    e.preventDefault();
    
    try {
      await axios.put(`${API}/agents/${selectedAgent.id}`, {
        name: selectedAgent.name,
        phone: selectedAgent.phone,
        mastercard_number: selectedAgent.mastercard_number,
        total_subscribers: parseInt(selectedAgent.total_subscribers),
        disconnected_count: parseInt(selectedAgent.disconnected_count)
      }, getAuthHeaders());
      toast.success("✓ تم تحديث بيانات الوكيل بنجاح");
      setShowEditAgent(false);
      setSelectedAgent(null);
      fetchData();
    } catch (error) {
      toast.error("فشل تحديث البيانات");
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الوكيل؟")) return;
    
    try {
      await axios.delete(`${API}/agents/${agentId}`, getAuthHeaders());
      toast.success("✓ تم حذف الوكيل بنجاح");
      fetchData();
    } catch (error) {
      toast.error("فشل حذف الوكيل");
    }
  };

  const handlePayment = async (agent) => {
    setPaymentAgent(agent);
    setPaymentAmount("");
    setShowPaymentPopup(true);
  };
  
  const submitPayment = async () => {
    if (!paymentAmount || isNaN(paymentAmount) || parseFloat(paymentAmount) <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }
    
    try {
      const response = await axios.post(
        `${API}/agents/${paymentAgent.id}/payment`,
        {},
        getAuthHeaders()
      );
      
      // تنظيف رقم الهاتف
      let cleanNumber = response.data.phone.replace(/[^0-9]/g, '');
      if (cleanNumber.startsWith('07')) {
        cleanNumber = '964' + cleanNumber.substring(1);
      }
      
      // الرسالة
      const message = `مرحباً ${paymentAgent.name}،

💰 *تم التحويل بنجاح!*

📅 *التاريخ:* ${new Date().toLocaleDateString('ar-IQ')}
💵 *المبلغ المحول:* ${parseFloat(paymentAmount).toLocaleString()} دينار عراقي

📊 *تفاصيل الحساب:*
👥 إجمالي المشتركين: ${paymentAgent.total_subscribers}
⚠️ غير متصلين: ${paymentAgent.disconnected_count}
✅ المشتركين النشطين: ${paymentAgent.active_subscribers}

💳 تم التحويل إلى الماستر كارد:
${paymentAgent.mastercard_number}

شكراً لتعاونكم المستمر 🙏
_نظام محاسبة الوكلاء_`;

      // فتح واتساب
      const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      toast.success("✓ تم تسجيل الدفعة وفتح واتساب 📱");
      setShowPaymentPopup(false);
      setPaymentAgent(null);
      setPaymentAmount("");
      fetchData();
    } catch (error) {
      toast.error("فشل تسجيل الدفعة");
    }
  };

  const sendWhatsAppMessage = (agent) => {
    let cleanNumber = agent.phone.replace(/[^0-9]/g, '');
    if (cleanNumber.startsWith('07')) {
      cleanNumber = '964' + cleanNumber.substring(1);
    }
    
    const message = `مرحباً ${agent.name}،

📊 *تقرير المشتركين الشهري*

👥 *إجمالي المشتركين:* ${agent.total_subscribers}
⚠️ *غير متصلين:* ${agent.disconnected_count}
✅ *المشتركين النشطين:* ${agent.active_subscribers}

💰 *المستحق الشهري:* ${agent.monthly_payment.toLocaleString()} دينار عراقي
(${agent.active_subscribers} مشترك × 5,000 = ${agent.monthly_payment.toLocaleString()})

💳 *الماستر كارد:* ${agent.mastercard_number}

يرجى تحديث بياناتك إذا كان هناك أي تغيير.

_نظام محاسبة الوكلاء_`;

    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast.success("تم فتح واتساب 📱");
  };

  const handleChangePassword = async () => {
    if (!settings.old_password || !settings.new_password) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }
    
    try {
      await axios.post(`${API}/auth/change-password`, {
        old_password: settings.old_password,
        new_password: settings.new_password
      }, getAuthHeaders());
      toast.success("✓ تم تغيير كلمة المرور بنجاح");
      setSettings({ old_password: "", new_password: "", new_username: "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل تغيير كلمة المرور");
    }
  };

  const handleChangeUsername = async () => {
    if (!settings.new_username) {
      toast.error("يرجى إدخال اسم مستخدم جديد");
      return;
    }
    
    try {
      await axios.post(
        `${API}/auth/change-username?new_username=${settings.new_username}`,
        {},
        getAuthHeaders()
      );
      toast.success("✓ تم تغيير اسم المستخدم بنجاح");
      setSettings({ old_password: "", new_password: "", new_username: "" });
      
      // تحديث البيانات المحلية
      const updatedUser = { ...user, username: settings.new_username };
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل تغيير اسم المستخدم");
    }
  };

  const calculateActive = () => {
    const total = parseInt(newAgent.total_subscribers) || 0;
    const disconnected = parseInt(newAgent.disconnected_count) || 0;
    return total - disconnected;
  };

  const calculatePayment = () => {
    return calculateActive() * 5000;
  };

  // Filter agents
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.phone.includes(searchTerm);
    return matchesSearch;
  });

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-bold mb-2 text-white drop-shadow-lg" style={{ fontFamily: 'Cairo, sans-serif' }}>
              📊 نظام محاسبة الوكلاء
            </h1>
            <p className="text-white/90 text-lg">مرحباً، {user.name}</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowSettings(true)} 
              className="bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all shadow-lg"
            >
              <SettingsIcon className="inline ml-2" size={20} />
              الإعدادات
            </button>
            <button onClick={onLogout} className="bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all shadow-lg">
              <LogOut className="inline ml-2" size={20} />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Clickable */}
      {stats && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div 
            onClick={() => {
              setFilterType("all");
              setSearchTerm("");
            }}
            className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl hover:scale-105 transition-transform cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">إجمالي الوكلاء</p>
                <p className="text-3xl font-bold text-purple-600">{stats.total_agents}</p>
              </div>
              <Users size={40} className="text-purple-400" />
            </div>
          </div>

          <div 
            onClick={() => setFilterType("all")}
            className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl hover:scale-105 transition-transform cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">إجمالي المشتركين</p>
                <p className="text-3xl font-bold text-blue-600">{stats.total_subscribers}</p>
              </div>
              <Activity size={40} className="text-blue-400" />
            </div>
          </div>

          <div 
            onClick={() => setFilterType("active")}
            className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl hover:scale-105 transition-transform cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">المشتركين النشطين</p>
                <p className="text-3xl font-bold text-green-600">{stats.total_active}</p>
              </div>
              <TrendingUp size={40} className="text-green-400" />
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">الدفع الشهري الكلي</p>
                <p className="text-2xl font-bold text-orange-600">{stats.total_monthly_payment?.toLocaleString()} د.ع</p>
              </div>
              <DollarSign size={40} className="text-orange-400" />
            </div>
          </div>
        </div>
      )}

      {/* Search & Add Agent Button */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="🔍 ابحث عن وكيل (الاسم أو رقم الهاتف)..."
            className="flex-1 px-6 py-4 rounded-xl bg-white/95 backdrop-blur-md shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            onClick={() => setShowAddAgent(true)}
            className="bg-white text-purple-600 px-6 py-4 rounded-xl hover:shadow-xl transition-all font-bold flex items-center gap-2 justify-center"
          >
            <UserPlus size={20} />
            إضافة وكيل جديد
          </button>
        </div>
      </div>

      {/* Agents List */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 gap-4">
          {filteredAgents && filteredAgents.length > 0 ? (
            filteredAgents.map((agent) => (
            <div 
              key={agent.id} 
              className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-gray-800">{agent.name}</h3>
                  </div>
                  <p className="text-gray-600 mb-1">📞 {agent.phone}</p>
                  <p className="text-gray-700 font-medium flex items-center gap-2">
                    <CreditCard size={18} className="text-blue-500" />
                    {agent.mastercard_number}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-4xl font-bold text-purple-600 mb-1">{agent.monthly_payment.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">دينار عراقي</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4 bg-gray-50 rounded-lg p-4">
                <div>
                  <p className="text-sm text-gray-600">إجمالي المشتركين</p>
                  <p className="text-2xl font-bold text-blue-600">{agent.total_subscribers}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">غير متصلين</p>
                  <p className="text-2xl font-bold text-red-600">{agent.disconnected_count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">النشطين</p>
                  <p className="text-2xl font-bold text-green-600">{agent.active_subscribers}</p>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-purple-700 font-medium">
                  💰 الحساب: {agent.active_subscribers} مشترك × 5,000 = {agent.monthly_payment.toLocaleString()} دينار
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handlePayment(agent)}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all flex items-center gap-2"
                >
                  <DollarSign size={18} />
                  تسديد وإرسال
                </button>
                <button
                  onClick={() => {
                    setSelectedAgentHistory(agent);
                    setShowAgentHistory(true);
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all flex items-center gap-2"
                >
                  <FileText size={18} />
                  السجل
                </button>
                <button
                  onClick={() => sendWhatsAppMessage(agent)}
                  className="bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-all flex items-center gap-2"
                >
                  <MessageCircle size={18} />
                  إرسال تقرير
                </button>
                <button
                  onClick={() => {
                    setSelectedAgent(agent);
                    setShowEditAgent(true);
                  }}
                  className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-all flex items-center gap-2"
                >
                  <Edit size={18} />
                  تعديل
                </button>
                <button
                  onClick={() => handleDeleteAgent(agent.id)}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all flex items-center gap-2"
                >
                  <Trash2 size={18} />
                  حذف
                </button>
              </div>
            </div>
          ))
          ) : (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-12 text-center shadow-xl">
              <p className="text-gray-500 text-xl">لا يوجد وكلاء حالياً</p>
              <p className="text-gray-400 mt-2">اضغط على "إضافة وكيل جديد" لإضافة وكيل</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Agent Modal */}
      {showAddAgent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <h2 className="text-3xl font-bold mb-6 text-purple-600">إضافة وكيل جديد</h2>
            <form onSubmit={handleAddAgent} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">اسم الوكيل *</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  required
                  placeholder="أحمد محمد"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">رقم الهاتف *</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                  value={newAgent.phone}
                  onChange={(e) => setNewAgent({ ...newAgent, phone: e.target.value })}
                  required
                  placeholder="07XXXXXXXXX"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">رقم الماستر كارد *</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                  value={newAgent.mastercard_number}
                  onChange={(e) => setNewAgent({ ...newAgent, mastercard_number: e.target.value })}
                  required
                  placeholder="1234-5678-9012-3456"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">عدد المشتركين *</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                    value={newAgent.total_subscribers}
                    onChange={(e) => setNewAgent({ ...newAgent, total_subscribers: e.target.value })}
                    required
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">عدد غير المتصلين *</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                    value={newAgent.disconnected_count}
                    onChange={(e) => setNewAgent({ ...newAgent, disconnected_count: e.target.value })}
                    required
                    min="0"
                  />
                </div>
              </div>

              {newAgent.total_subscribers && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 space-y-2">
                  <div className="flex justify-between items-center border-b border-purple-200 pb-2">
                    <span className="text-gray-700 font-medium">المشتركين النشطين:</span>
                    <span className="text-2xl font-bold text-green-600">{calculateActive()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 font-medium">الحساب:</span>
                    <span className="text-sm text-purple-600">{calculateActive()} × 5,000</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-purple-200">
                    <span className="text-gray-800 font-bold text-lg">المبلغ الشهري:</span>
                    <span className="text-3xl font-bold text-purple-700">{calculatePayment().toLocaleString()} د.ع</span>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button type="submit" className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-all font-bold">
                  إضافة الوكيل
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddAgent(false);
                    setNewAgent({
                      name: "",
                      phone: "",
                      mastercard_number: "",
                      total_subscribers: "",
                      disconnected_count: ""
                    });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-all font-bold"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Agent Modal */}
      {showEditAgent && selectedAgent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <h2 className="text-3xl font-bold mb-6 text-purple-600">تعديل بيانات الوكيل</h2>
            <form onSubmit={handleUpdateAgent} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">اسم الوكيل *</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                  value={selectedAgent.name}
                  onChange={(e) => setSelectedAgent({ ...selectedAgent, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">رقم الهاتف *</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                  value={selectedAgent.phone}
                  onChange={(e) => setSelectedAgent({ ...selectedAgent, phone: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">رقم الماستر كارد *</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                  value={selectedAgent.mastercard_number}
                  onChange={(e) => setSelectedAgent({ ...selectedAgent, mastercard_number: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">عدد المشتركين *</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                    value={selectedAgent.total_subscribers}
                    onChange={(e) => setSelectedAgent({ ...selectedAgent, total_subscribers: e.target.value })}
                    required
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">عدد غير المتصلين *</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                    value={selectedAgent.disconnected_count}
                    onChange={(e) => setSelectedAgent({ ...selectedAgent, disconnected_count: e.target.value })}
                    required
                    min="0"
                  />
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-lg font-bold text-purple-700">
                  المشتركين النشطين: {parseInt(selectedAgent.total_subscribers) - parseInt(selectedAgent.disconnected_count)}
                </p>
                <p className="text-lg font-bold text-purple-700">
                  المبلغ الشهري: {((parseInt(selectedAgent.total_subscribers) - parseInt(selectedAgent.disconnected_count)) * 5000).toLocaleString()} د.ع
                </p>
              </div>

              <div className="flex gap-4">
                <button type="submit" className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-all font-bold">
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditAgent(false);
                    setSelectedAgent(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-all font-bold"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <h2 className="text-3xl font-bold mb-6 text-purple-600">⚙️ الإعدادات</h2>
            
            {/* Change Password Section */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="text-xl font-bold mb-4 text-gray-800">تغيير كلمة المرور</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">كلمة المرور القديمة</label>
                  <input
                    type="password"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                    value={settings.old_password}
                    onChange={(e) => setSettings({ ...settings, old_password: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                    value={settings.new_password}
                    onChange={(e) => setSettings({ ...settings, new_password: e.target.value })}
                  />
                </div>

                <button
                  onClick={handleChangePassword}
                  className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-all font-bold"
                >
                  تغيير كلمة المرور
                </button>
              </div>
            </div>

            {/* Change Username Section */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="text-xl font-bold mb-4 text-gray-800">تغيير اسم المستخدم</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">اسم المستخدم الجديد</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                    value={settings.new_username}
                    onChange={(e) => setSettings({ ...settings, new_username: e.target.value })}
                    placeholder={user.username}
                  />
                </div>

                <button
                  onClick={handleChangeUsername}
                  className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-all font-bold"
                >
                  تغيير اسم المستخدم
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  // حفظ أي تغييرات مفتوحة
                  setShowSettings(false);
                }}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all font-bold flex items-center justify-center gap-2"
              >
                <Save size={20} />
                حفظ
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-all font-bold flex items-center justify-center gap-2"
              >
                <X size={20} />
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent History Modal */}
      {showAgentHistory && selectedAgentHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-bold text-purple-600 flex items-center gap-2">
                  <FileText size={32} />
                  سجل الوكيل
                </h2>
                <p className="text-gray-600 mt-1">{selectedAgentHistory.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowAgentHistory(false);
                  setSelectedAgentHistory(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={32} />
              </button>
            </div>
            
            {/* Agent Summary */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">الهاتف</p>
                  <p className="font-bold text-gray-800">{selectedAgentHistory.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">المشتركين</p>
                  <p className="font-bold text-blue-600">{selectedAgentHistory.total_subscribers}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">النشطين</p>
                  <p className="font-bold text-green-600">{selectedAgentHistory.active_subscribers}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">المستحق الشهري</p>
                  <p className="font-bold text-purple-600">{selectedAgentHistory.monthly_payment.toLocaleString()} د.ع</p>
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div>
              <h3 className="text-xl font-bold mb-4 text-gray-800">📋 سجل التسديدات</h3>
              {selectedAgentHistory.payments_history && selectedAgentHistory.payments_history.length > 0 ? (
                <div className="space-y-3">
                  {selectedAgentHistory.payments_history.map((payment, index) => (
                    <div key={index} className="bg-white border-2 border-purple-100 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-lg text-green-600">{payment.amount.toLocaleString()} د.ع</p>
                          <p className="text-sm text-gray-600">المشتركين النشطين: {payment.active_subscribers}</p>
                          <p className="text-sm text-gray-500">بواسطة: {payment.by}</p>
                        </div>
                        <div className="text-left">
                          <p className="text-sm text-gray-500">📅 {new Date(payment.date).toLocaleDateString('ar-IQ')}</p>
                          <p className="text-sm text-gray-500">🕐 {new Date(payment.date).toLocaleTimeString('ar-IQ')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <p className="text-gray-500 text-lg">لا توجد تسديدات مسجلة</p>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setShowAgentHistory(false);
                setSelectedAgentHistory(null);
              }}
              className="w-full mt-6 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-all font-bold"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Payment Popup */}
      {showPaymentPopup && paymentAgent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8">
            <h2 className="text-3xl font-bold mb-6 text-green-600 flex items-center gap-2">
              <DollarSign size={32} />
              تسديد دفعة للوكيل
            </h2>
            
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-xl mb-4 text-gray-800">معلومات الوكيل:</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700">الاسم:</span>
                  <span className="font-bold">{paymentAgent.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">الهاتف:</span>
                  <span className="font-bold">{paymentAgent.phone}</span>
                </div>
                <div className="flex justify-between border-t border-purple-200 pt-2 mt-2">
                  <span className="text-gray-700">المشتركين النشطين:</span>
                  <span className="font-bold text-green-600">{paymentAgent.active_subscribers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">المبلغ المستحق:</span>
                  <span className="font-bold text-purple-600 text-xl">{paymentAgent.monthly_payment.toLocaleString()} د.ع</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-bold mb-3 text-lg">المبلغ المراد تسديده *</label>
              <div className="relative">
                <input
                  type="number"
                  className="w-full px-6 py-4 rounded-xl border-2 border-gray-300 focus:outline-none focus:border-green-400 text-2xl font-bold text-center"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  autoFocus
                />
                <span className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-500 text-xl">د.ع</span>
              </div>
              
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setPaymentAmount(paymentAgent.monthly_payment.toString())}
                  className="flex-1 bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-all font-bold"
                >
                  المبلغ المستحق
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentAmount((paymentAgent.monthly_payment / 2).toString())}
                  className="flex-1 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-all font-bold"
                >
                  نصف المبلغ
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={submitPayment}
                className="flex-1 bg-green-600 text-white px-6 py-4 rounded-lg hover:bg-green-700 transition-all font-bold text-lg flex items-center justify-center gap-2"
              >
                <DollarSign size={24} />
                تسديد وإرسال
              </button>
              <button
                onClick={() => {
                  setShowPaymentPopup(false);
                  setPaymentAgent(null);
                  setPaymentAmount("");
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-6 py-4 rounded-lg hover:bg-gray-400 transition-all font-bold text-lg"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentsSystem;
