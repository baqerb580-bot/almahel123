import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Smartphone, TrendingUp, DollarSign, Wrench, Plus, Search, 
  LogOut, Package, Calendar, User, Settings as SettingsIcon, Edit, Trash2, Printer, MessageCircle
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PhoneRepairSystemFull = ({ user, onLogout }) => {
  const [repairs, setRepairs] = useState([]);
  const [parts, setParts] = useState([]);
  const [repairDebts, setRepairDebts] = useState([]);
  const [stats, setStats] = useState(null);
  const [debtsStats, setDebtsStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debtsSearchTerm, setDebtsSearchTerm] = useState("");
  const [currentView, setCurrentView] = useState("repairs"); // "repairs", "debts", "parts"
  const [showAddRepair, setShowAddRepair] = useState(false);
  const [showEditRepair, setShowEditRepair] = useState(false);
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [showEditDebt, setShowEditDebt] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [showAddPart, setShowAddPart] = useState(false);
  const [showPartsModal, setShowPartsModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState("monthly");
  const [partSearchTerm, setPartSearchTerm] = useState("");
  
  const [newRepair, setNewRepair] = useState({
    customer_name: "",
    customer_phone: "",
    phone_model: "",
    issue_description: "",
    repair_cost: "",
    parts_used: [],
    paid_amount: "",
    due_date: "",
    customer_telegram_id: ""
  });

  const [newDebt, setNewDebt] = useState({
    customer_name: "",
    customer_phone: "",
    phone_model: "",
    issue_description: "",
    repair_cost: "",
    parts_used: [],
    paid_amount: "",
    due_date: "",
    customer_telegram_id: ""
  });


  const [newPart, setNewPart] = useState({ name: "", cost: "" });
  const [newSparePart, setNewSparePart] = useState({
    phone_model: "",
    part_name: "",
    cost: "",
    quantity: 1
  });

  const [settings, setSettings] = useState({
    old_password: "",
    new_password: "",
    new_username: "",
    telegram_chat_id: user.telegram_chat_id || ""
  });

  const [selectedPart, setSelectedPart] = useState(null);
  const [showEditPart, setShowEditPart] = useState(false);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statsPeriod]);

  const fetchData = async () => {
    try {
      const [repairsRes, partsRes, statsRes, debtsRes, debtsStatsRes] = await Promise.all([
        axios.get(`${API}/repairs?search=${searchTerm}`, getAuthHeaders()),
        axios.get(`${API}/parts`, getAuthHeaders()),
        axios.get(`${API}/repairs/stats?period=${statsPeriod}`, getAuthHeaders()),
        axios.get(`${API}/repair-debts`, getAuthHeaders()),
        axios.get(`${API}/repair-debts/stats`, getAuthHeaders())
      ]);
      setRepairs(repairsRes.data);
      setParts(partsRes.data);
      setStats(statsRes.data);
      setRepairDebts(debtsRes.data);
      setDebtsStats(debtsStatsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleCreateRepair = async (e) => {
    e.preventDefault();
    
    try {
      const repairData = {
        customer_name: newRepair.customer_name,
        customer_phone: newRepair.customer_phone,
        phone_model: newRepair.phone_model,
        issue_description: newRepair.issue_description,
        repair_cost: parseFloat(newRepair.repair_cost),
        parts_used: newRepair.parts_used || [],
        paid_amount: parseFloat(newRepair.paid_amount || 0),
        due_date: newRepair.due_date || new Date().toISOString().split('T')[0],
        customer_telegram_id: newRepair.customer_telegram_id || ""
      };
      
      console.log("Sending repair data:", repairData);
      
      await axios.post(`${API}/repairs`, repairData, getAuthHeaders());
      toast.success("✓ تم إضافة الصيانة بنجاح");
      setShowAddRepair(false);
      setNewRepair({
        customer_name: "",
        customer_phone: "",
        phone_model: "",
        issue_description: "",
        repair_cost: "",
        parts_used: [],
        paid_amount: "",
        due_date: "",
        customer_telegram_id: ""
      });
      fetchData();
    } catch (error) {
      console.error("Error adding repair:", error);
      toast.error(error.response?.data?.detail || "فشل إضافة الصيانة");
    }
  };

  const handleUpdateRepair = async (e) => {
    e.preventDefault();
    
    try {
      await axios.put(`${API}/repairs/${selectedRepair.id}`, {
        customer_name: selectedRepair.customer_name,
        customer_phone: selectedRepair.customer_phone,
        phone_model: selectedRepair.phone_model,
        issue_description: selectedRepair.issue_description,
        repair_cost: parseFloat(selectedRepair.repair_cost),
        parts_used: selectedRepair.parts_used,
        paid_amount: parseFloat(selectedRepair.paid_amount),
        due_date: selectedRepair.due_date,
        customer_telegram_id: selectedRepair.customer_telegram_id || ""
      }, getAuthHeaders());
      toast.success("✓ تم تحديث الصيانة بنجاح");
      setShowEditRepair(false);
      setSelectedRepair(null);
      fetchData();
    } catch (error) {
      toast.error("فشل تحديث الصيانة");
    }
  };

  const handleDeleteRepair = async (repairId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الصيانة؟")) return;
    
    try {
      await axios.delete(`${API}/repairs/${repairId}`, getAuthHeaders());
      toast.success("✓ تم حذف الصيانة بنجاح");
      fetchData();
    } catch (error) {
      toast.error("فشل حذف الصيانة");
    }
  };


  const handleAddSparePart = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post(
        `${API}/parts?phone_model=${newSparePart.phone_model}&part_name=${newSparePart.part_name}&cost=${newSparePart.cost}&quantity=${newSparePart.quantity}`,
        {},
        getAuthHeaders()
      );
      toast.success("✓ تم إضافة قطعة الغيار بنجاح");
      setShowAddPart(false);
      setNewSparePart({
        phone_model: "",
        part_name: "",
        cost: "",
        quantity: 1
      });
      fetchData();
    } catch (error) {
      toast.error("فشل إضافة قطعة الغيار");
    }
  };

  // ============== REPAIR DEBTS FUNCTIONS ==============
  
  const handleCreateDebt = async (e) => {
    e.preventDefault();
    
    try {
      const debtData = {
        customer_name: newDebt.customer_name,
        customer_phone: newDebt.customer_phone,
        phone_model: newDebt.phone_model,
        issue_description: newDebt.issue_description,
        repair_cost: parseFloat(newDebt.repair_cost),
        parts_used: newDebt.parts_used || [],
        paid_amount: parseFloat(newDebt.paid_amount || 0),
        due_date: newDebt.due_date || new Date().toISOString().split('T')[0],
        customer_telegram_id: newDebt.customer_telegram_id || ""
      };
      
      console.log("Sending repair debt data:", debtData);
      
      await axios.post(`${API}/repair-debts`, debtData, getAuthHeaders());
      toast.success("✓ تم إضافة دين الصيانة بنجاح");
      setShowAddDebt(false);
      setNewDebt({
        customer_name: "",
        customer_phone: "",
        phone_model: "",
        issue_description: "",
        repair_cost: "",
        parts_used: [],
        paid_amount: "",
        due_date: "",
        customer_telegram_id: ""
      });
      fetchData();
    } catch (error) {
      console.error("Error adding repair debt:", error);
      toast.error(error.response?.data?.detail || "فشل إضافة دين الصيانة");
    }
  };

  const handleUpdateDebt = async (e) => {
    e.preventDefault();
    
    try {
      await axios.put(`${API}/repair-debts/${selectedDebt.id}`, {
        customer_name: selectedDebt.customer_name,
        customer_phone: selectedDebt.customer_phone,
        phone_model: selectedDebt.phone_model,
        issue_description: selectedDebt.issue_description,
        repair_cost: parseFloat(selectedDebt.repair_cost),
        parts_used: selectedDebt.parts_used,
        paid_amount: parseFloat(selectedDebt.paid_amount),
        due_date: selectedDebt.due_date,
        customer_telegram_id: selectedDebt.customer_telegram_id || ""
      }, getAuthHeaders());
      toast.success("✓ تم تحديث دين الصيانة بنجاح");
      setShowEditDebt(false);
      setSelectedDebt(null);
      fetchData();
    } catch (error) {
      toast.error("فشل تحديث دين الصيانة");
    }
  };

  const handleDeleteDebt = async (debtId) => {
    if (!window.confirm("هل أنت متأكد من حذف دين الصيانة هذا؟")) return;
    
    try {
      await axios.delete(`${API}/repair-debts/${debtId}`, getAuthHeaders());
      toast.success("✓ تم حذف دين الصيانة بنجاح");
      fetchData();
    } catch (error) {
      toast.error("فشل حذف دين الصيانة");
    }
  };

  const sendWhatsAppReminderForDebt = (debt) => {
    // تنظيف رقم الهاتف
    let cleanNumber = debt.customer_phone.replace(/[^0-9]/g, '');
    
    // إضافة 964 إذا بدأ بـ 07
    if (cleanNumber.startsWith('07')) {
      cleanNumber = '964' + cleanNumber.substring(1);
    }
    
    // الرسالة الجاهزة
    const message = `مرحباً ${debt.customer_name}،

🔔 *تذكير بدين صيانة الهاتف*

📱 *الجهاز:* ${debt.phone_model}
🔧 *العطل:* ${debt.issue_description}
💰 *التكلفة الكلية:* ${debt.repair_cost.toLocaleString()} دينار عراقي
✅ *المبلغ المدفوع:* ${debt.paid_amount.toLocaleString()} دينار
⚠️ *المبلغ المتبقي:* ${debt.remaining_amount.toLocaleString()} دينار

📅 *تاريخ الاستحقاق:* ${new Date(debt.due_date).toLocaleDateString('ar-IQ')}

يرجى تسديد المبلغ المتبقي في أقرب وقت ممكن.

شكراً لتعاونكم 🙏`;

    // فتح واتساب
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    toast.success("تم فتح واتساب - أرسل الرسالة الآن 📱");
  };

  const handleUpdatePart = async (e) => {
    e.preventDefault();
    
    try {
      await axios.put(`${API}/parts/${selectedPart.id}`, {
        phone_model: selectedPart.phone_model,
        part_name: selectedPart.part_name,
        cost: parseFloat(selectedPart.cost),
        quantity: parseInt(selectedPart.quantity)
      }, getAuthHeaders());
      toast.success("✓ تم تحديث قطعة الغيار بنجاح");
      setShowEditPart(false);
      setSelectedPart(null);
      fetchData();
    } catch (error) {
      toast.error("فشل تحديث قطعة الغيار");
    }
  };

  const handleDeletePart = async (partId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه القطعة؟")) return;
    
    try {
      await axios.delete(`${API}/parts/${partId}`, getAuthHeaders());
      toast.success("✓ تم حذف قطعة الغيار بنجاح");
      fetchData();
    } catch (error) {
      toast.error("فشل حذف قطعة الغيار");
    }
  };

  const addPartToRepair = () => {
    if (!newPart.name || !newPart.cost) {
      toast.error("يرجى إدخال اسم القطعة والتكلفة");
      return;
    }
    
    setNewRepair({
      ...newRepair,
      parts_used: [...newRepair.parts_used, { name: newPart.name, cost: parseFloat(newPart.cost) }]
    });
    setNewPart({ name: "", cost: "" });
  };

  const removePartFromRepair = (index) => {
    const updated = newRepair.parts_used.filter((_, i) => i !== index);
    setNewRepair({ ...newRepair, parts_used: updated });
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
      toast.error("يرجى إدخال اسم المستخدم الجديد");
      return;
    }
    
    try {
      await axios.post(`${API}/auth/change-username?new_username=${settings.new_username}`, {}, getAuthHeaders());
      toast.success("✓ تم تغيير اسم المستخدم بنجاح - يرجى تسجيل الدخول مرة أخرى");
      setTimeout(() => {
        onLogout();
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل تغيير اسم المستخدم");
    }
  };

  const handleUpdateTelegramId = async () => {
    try {
      await axios.patch(
        `${API}/users/${user.id}/telegram`,
        { telegram_chat_id: settings.telegram_chat_id },
        getAuthHeaders()
      );
      
      toast.success("✓ تم تحديث Telegram ID بنجاح");
      
      // تحديث البيانات المحلية
      const updatedUser = { ...user, telegram_chat_id: settings.telegram_chat_id };
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (error) {
      toast.error("فشل تحديث Telegram ID");
    }
  };

  const filteredParts = partSearchTerm
    ? (parts || []).filter(p => 
        p.phone_model.toLowerCase().includes(partSearchTerm.toLowerCase()) ||
        p.part_name.toLowerCase().includes(partSearchTerm.toLowerCase())
      )
    : (parts || []);

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-bold mb-2 text-white drop-shadow-lg" style={{ fontFamily: 'Cairo, sans-serif' }}>
              📱 نظام صيانة الهواتف
            </h1>
            <p className="text-white/90 text-lg">مرحباً، {user.name}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowPartsModal(true)}
              className="bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all shadow-lg flex items-center gap-2"
            >
              <Package size={20} />
              قطع الغيار ({parts.length})
            </button>
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

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex gap-4 bg-white/20 backdrop-blur-md p-2 rounded-xl">
          <button
            onClick={() => setCurrentView("repairs")}
            className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all ${
              currentView === "repairs"
                ? "bg-white text-purple-600 shadow-lg"
                : "text-white hover:bg-white/10"
            }`}
          >
            🔧 الصيانات
          </button>
          <button
            onClick={() => setCurrentView("debts")}
            className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all ${
              currentView === "debts"
                ? "bg-white text-purple-600 shadow-lg"
                : "text-white hover:bg-white/10"
            }`}
          >
            💳 ديون الصيانة
          </button>
          <button
            onClick={() => setCurrentView("parts")}
            className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all ${
              currentView === "parts"
                ? "bg-white text-purple-600 shadow-lg"
                : "text-white hover:bg-white/10"
            }`}
          >
            📦 قطع الغيار
          </button>
        </div>
      </div>

      {/* REPAIRS VIEW */}
      {currentView === "repairs" && (
        <>
      {/* Stats Period Selector */}
      <div className="max-w-7xl mx-auto mb-4">
        <select
          className="px-6 py-3 rounded-xl border-2 border-white/50 bg-white/90 backdrop-blur-md focus:outline-none focus:border-purple-400"
          value={statsPeriod}
          onChange={(e) => setStatsPeriod(e.target.value)}
        >
          <option value="weekly">إحصائيات أسبوعية</option>
          <option value="monthly">إحصائيات شهرية</option>
        </select>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">عدد الصيانات</p>
                <p className="text-3xl font-bold text-indigo-600">{stats.total_repairs}</p>
              </div>
              <Smartphone size={40} className="text-indigo-400" />
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">الإيرادات</p>
                <p className="text-2xl font-bold text-green-600">{stats.total_revenue?.toLocaleString() || '0'} د.ع</p>
              </div>
              <DollarSign size={40} className="text-green-400" />
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">الربح الصافي</p>
                <p className="text-2xl font-bold text-purple-600">{stats.total_profit?.toLocaleString() || '0'} د.ع</p>
              </div>
              <TrendingUp size={40} className="text-purple-400" />
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">المتبقي</p>
                <p className="text-2xl font-bold text-orange-600">{stats.total_remaining?.toLocaleString() || '0'} د.ع</p>
              </div>
              <Package size={40} className="text-orange-400" />
            </div>
          </div>
        </div>
      )}

      {/* Actions & Search */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-wrap gap-4">
        <button
          onClick={() => setShowAddRepair(true)}
          className="bg-white text-indigo-600 px-6 py-3 rounded-xl hover:shadow-xl transition-all font-bold flex items-center gap-2"
        >
          <Plus size={20} />
          إضافة صيانة جديدة
        </button>

        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="ابحث (اسم، رقم، موديل الهاتف)..."
              className="w-full pr-12 pl-4 py-3 rounded-xl border-2 border-white/50 bg-white/90 backdrop-blur-md focus:outline-none focus:border-indigo-400 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Repairs List */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 gap-4">
          {(repairs || []).length > 0 ? (
            (repairs || []).map((repair) => (
            <div key={repair.id} className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <User size={24} className="text-indigo-500" />
                    <h3 className="text-2xl font-bold text-gray-800">{repair.customer_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      repair.status === 'paid' ? 'bg-green-100 text-green-700' :
                      repair.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {repair.status === 'paid' ? 'مسدد' : 
                       repair.status === 'completed' ? 'مكتمل' : 'قيد التنفيذ'}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-1">📞 {repair.customer_phone}</p>
                  <p className="text-gray-700 font-medium mb-1">📱 موديل: {repair.phone_model}</p>
                  <p className="text-gray-600">🔧 {repair.issue_description}</p>
                </div>
                <div className="text-left">
                  <p className="text-3xl font-bold text-indigo-600 mb-1">{repair.repair_cost.toLocaleString()} د.ع</p>
                  <p className="text-sm text-gray-500">مدفوع: {repair.paid_amount.toLocaleString()} د.ع</p>
                  {repair.remaining_amount > 0 && (
                    <p className="text-sm text-red-600 font-bold">متبقي: {repair.remaining_amount.toLocaleString()} د.ع</p>
                  )}
                </div>
              </div>

              {repair.parts_used && repair.parts_used.length > 0 && (
                <div className="bg-indigo-50 rounded-lg p-4 mb-3">
                  <p className="font-bold text-indigo-700 mb-2">🔩 القطع المستخدمة:</p>
                  <div className="space-y-1">
                    {repair.parts_used.map((part, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{part.name}</span>
                        <span className="font-medium">{part.cost?.toLocaleString()} د.ع</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-gray-200 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span>{new Date(repair.created_at).toLocaleDateString('ar-IQ')}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedRepair(repair);
                      setShowEditRepair(true);
                    }}
                    className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-all flex items-center gap-2"
                  >
                    <Edit size={16} />
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDeleteRepair(repair.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    حذف
                  </button>
                </div>
              </div>
            </div>
          ))
          ) : (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-12 text-center shadow-xl">
              <p className="text-gray-500 text-xl">لا توجد صيانات حالياً</p>
              <p className="text-gray-400 mt-2">اضغط على "إضافة صيانة جديدة" لإضافة صيانة</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Repair Modal */}
      {showAddRepair && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8">
            <h2 className="text-3xl font-bold mb-6 text-indigo-600">إضافة صيانة جديدة</h2>
            <form onSubmit={handleCreateRepair} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">اسم الزبون *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                    value={newRepair.customer_name}
                    onChange={(e) => setNewRepair({ ...newRepair, customer_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">رقم الهاتف *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                    value={newRepair.customer_phone}
                    onChange={(e) => setNewRepair({ ...newRepair, customer_phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">موديل الهاتف *</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                  value={newRepair.phone_model}
                  onChange={(e) => setNewRepair({ ...newRepair, phone_model: e.target.value })}
                  placeholder="مثال: iPhone 14 Pro"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">وصف العطل *</label>
                <textarea
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                  rows="3"
                  value={newRepair.issue_description}
                  onChange={(e) => setNewRepair({ ...newRepair, issue_description: e.target.value })}
                  required
                />
              </div>

              {/* Parts Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-gray-800 mb-3">🔩 القطع المستخدمة</h3>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="اسم القطعة"
                    className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                    value={newPart.name}
                    onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="التكلفة"
                    className="w-32 px-4 py-2 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                    value={newPart.cost}
                    onChange={(e) => setNewPart({ ...newPart, cost: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={addPartToRepair}
                    className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-all"
                  >
                    إضافة
                  </button>
                </div>
                
                {newRepair.parts_used.length > 0 && (
                  <div className="space-y-2">
                    {newRepair.parts_used.map((part, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-2 rounded">
                        <span>{part.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{part.cost.toLocaleString()} د.ع</span>
                          <button
                            type="button"
                            onClick={() => removePartFromRepair(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">تكلفة الإصلاح (د.ع) *</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                    value={newRepair.repair_cost}
                    onChange={(e) => setNewRepair({ ...newRepair, repair_cost: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">المبلغ المدفوع (د.ع)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                    value={newRepair.paid_amount}
                    onChange={(e) => setNewRepair({ ...newRepair, paid_amount: e.target.value })}
                  />
                </div>
              </div>

              {newRepair.repair_cost && (
                <div className="bg-indigo-50 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600">التكلفة الكلية</p>
                      <p className="text-lg font-bold text-indigo-700">{parseFloat(newRepair.repair_cost).toLocaleString()} د.ع</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">تكلفة القطع</p>
                      <p className="text-lg font-bold text-red-600">
                        {newRepair.parts_used.reduce((sum, p) => sum + p.cost, 0).toLocaleString()} د.ع
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">الربح الصافي</p>
                      <p className="text-lg font-bold text-green-600">
                        {(parseFloat(newRepair.repair_cost || 0) - newRepair.parts_used.reduce((sum, p) => sum + p.cost, 0)).toLocaleString()} د.ع
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button type="submit" className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-all font-bold">
                  إضافة الصيانة
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddRepair(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-all font-bold"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Edit Repair Modal */}
      {showEditRepair && selectedRepair && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8">
            <h2 className="text-3xl font-bold mb-6 text-indigo-600">تعديل الصيانة</h2>
            <form onSubmit={handleUpdateRepair} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">اسم الزبون *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                    value={selectedRepair.customer_name}
                    onChange={(e) => setSelectedRepair({ ...selectedRepair, customer_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">رقم الهاتف *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                    value={selectedRepair.customer_phone}
                    onChange={(e) => setSelectedRepair({ ...selectedRepair, customer_phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">موديل الهاتف *</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                  value={selectedRepair.phone_model}
                  onChange={(e) => setSelectedRepair({ ...selectedRepair, phone_model: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">وصف العطل *</label>
                <textarea
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                  rows="3"
                  value={selectedRepair.issue_description}
                  onChange={(e) => setSelectedRepair({ ...selectedRepair, issue_description: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">تكلفة الإصلاح (د.ع) *</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                    value={selectedRepair.repair_cost}
                    onChange={(e) => setSelectedRepair({ ...selectedRepair, repair_cost: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">المبلغ المدفوع (د.ع)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                    value={selectedRepair.paid_amount}
                    onChange={(e) => setSelectedRepair({ ...selectedRepair, paid_amount: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button type="submit" className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-all font-bold">
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditRepair(false);
                    setSelectedRepair(null);
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

      {/* Parts Modal */}
      {showPartsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-indigo-600">📦 قطع الغيار المتوفرة</h2>
              <button onClick={() => setShowPartsModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                ✕
              </button>
            </div>

            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setShowAddPart(true)}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-all font-bold flex items-center gap-2"
              >
                <Plus size={20} />
                إضافة قطعة غيار
              </button>
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="ابحث عن موديل أو قطعة..."
                    className="w-full pr-12 pl-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                    value={partSearchTerm}
                    onChange={(e) => setPartSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredParts.map((part) => (
                <div key={part.id} className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800">📱 {part.phone_model}</h3>
                      <p className="text-gray-600 mt-1">🔧 {part.part_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-indigo-600">{part.cost.toLocaleString()} د.ع</p>
                      <p className="text-sm text-gray-500">الكمية: {part.quantity}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setSelectedPart(part);
                        setShowEditPart(true);
                      }}
                      className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Edit size={16} />
                      تعديل
                    </button>
                    <button
                      onClick={() => handleDeletePart(part.id)}
                      className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 size={16} />
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredParts.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Package size={64} className="mx-auto mb-4 opacity-50" />
                <p className="text-xl">لا توجد قطع غيار</p>
                <p className="text-sm mt-2">قم بإضافة قطع الغيار المتوفرة لديك</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Part Modal */}
      {showAddPart && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold mb-6 text-indigo-600">إضافة قطعة غيار</h2>
            <form onSubmit={handleAddSparePart} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">موديل الهاتف *</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                  value={newSparePart.phone_model}
                  onChange={(e) => setNewSparePart({ ...newSparePart, phone_model: e.target.value })}
                  placeholder="مثال: iPhone X Max"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">اسم القطعة *</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                  value={newSparePart.part_name}
                  onChange={(e) => setNewSparePart({ ...newSparePart, part_name: e.target.value })}
                  placeholder="مثال: بطارية، شاشة، سماعة"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">السعر (د.ع) *</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                    value={newSparePart.cost}
                    onChange={(e) => setNewSparePart({ ...newSparePart, cost: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">الكمية *</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                    value={newSparePart.quantity}
                    onChange={(e) => setNewSparePart({ ...newSparePart, quantity: e.target.value })}
                    required
                    min="1"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button type="submit" className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-all font-bold">
                  إضافة
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPart(false);
                    setNewSparePart({ phone_model: "", part_name: "", cost: "", quantity: 1 });
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

      {/* Edit Part Modal */}
      {showEditPart && selectedPart && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold mb-6 text-indigo-600">تعديل قطعة الغيار</h2>
            <form onSubmit={handleUpdatePart} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">موديل الهاتف *</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                  value={selectedPart.phone_model}
                  onChange={(e) => setSelectedPart({ ...selectedPart, phone_model: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">اسم القطعة *</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                  value={selectedPart.part_name}
                  onChange={(e) => setSelectedPart({ ...selectedPart, part_name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">السعر (د.ع) *</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                    value={selectedPart.cost}
                    onChange={(e) => setSelectedPart({ ...selectedPart, cost: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">الكمية *</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                    value={selectedPart.quantity}
                    onChange={(e) => setSelectedPart({ ...selectedPart, quantity: e.target.value })}
                    required
                    min="1"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button type="submit" className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-all font-bold">
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditPart(false);
                    setSelectedPart(null);
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

        </>
      )}

      {/* DEBTS VIEW (ديون الصيانة) */}
      {currentView === "debts" && (
        <>
          {/* Debts Stats */}
          {debtsStats && (
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl">
                <p className="text-gray-600 text-sm mb-1">إجمالي الديون</p>
                <p className="text-3xl font-bold text-red-600">{debtsStats.total_debts}</p>
              </div>
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl">
                <p className="text-gray-600 text-sm mb-1">المبلغ الكلي</p>
                <p className="text-3xl font-bold text-blue-600">{debtsStats?.total_amount?.toLocaleString() || '0'} د.ع</p>
              </div>
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl">
                <p className="text-gray-600 text-sm mb-1">المبلغ المدفوع</p>
                <p className="text-3xl font-bold text-green-600">{debtsStats?.total_paid?.toLocaleString() || '0'} د.ع</p>
              </div>
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl">
                <p className="text-gray-600 text-sm mb-1">المبلغ المتبقي</p>
                <p className="text-3xl font-bold text-red-600">{debtsStats?.total_remaining?.toLocaleString() || '0'} د.ع</p>
              </div>
            </div>
          )}

          {/* Add Debt Button */}
          <div className="max-w-7xl mx-auto mb-6">
            <button
              onClick={() => setShowAddDebt(true)}
              className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-4 rounded-xl hover:from-red-700 hover:to-pink-700 transition-all shadow-lg font-bold text-lg"
            >
              ➕ إضافة دين صيانة جديد
            </button>
          </div>

          {/* Debts List */}
          <div className="max-w-7xl mx-auto">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">📝 قائمة ديون الصيانة</h3>
              
              {/* Search */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="🔍 ابحث عن زبون، رقم، أو موديل..."
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                  value={debtsSearchTerm}
                  onChange={(e) => setDebtsSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                {(repairDebts || [])
                  .filter(debt =>
                    debt.customer_name.toLowerCase().includes(debtsSearchTerm.toLowerCase()) ||
                    debt.customer_phone.includes(debtsSearchTerm) ||
                    debt.phone_model.toLowerCase().includes(debtsSearchTerm.toLowerCase())
                  )
                  .map((debt) => (
                    <div key={debt.id} className="border-2 border-red-200 rounded-xl p-6 bg-red-50/50 hover:shadow-lg transition-all">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">الزبون</p>
                          <p className="font-bold text-lg text-gray-800">{debt.customer_name}</p>
                          <p className="text-gray-600">{debt.customer_phone}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">الجهاز</p>
                          <p className="font-bold text-gray-800">{debt.phone_model}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-1">العطل</p>
                        <p className="text-gray-700">{debt.issue_description}</p>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-white rounded-lg">
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-1">التكلفة الكلية</p>
                          <p className="font-bold text-lg text-blue-600">{debt.repair_cost.toLocaleString()} د.ع</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-1">المبلغ المدفوع</p>
                          <p className="font-bold text-lg text-green-600">{debt.paid_amount.toLocaleString()} د.ع</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-1">المبلغ المتبقي</p>
                          <p className="font-bold text-lg text-red-600">{debt.remaining_amount.toLocaleString()} د.ع</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-500">
                          📅 تاريخ الاستحقاق: {new Date(debt.due_date).toLocaleDateString('ar-IQ')}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => sendWhatsAppReminderForDebt(debt)}
                            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all flex items-center gap-2"
                            title="إرسال تذكير عبر WhatsApp"
                          >
                            <MessageCircle size={18} />
                            واتساب
                          </button>
                          <button
                            onClick={() => {
                              setSelectedDebt(debt);
                              setShowEditDebt(true);
                            }}
                            className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-all flex items-center gap-2"
                          >
                            <Edit size={16} />
                            تعديل
                          </button>
                          <button
                            onClick={() => handleDeleteDebt(debt.id)}
                            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all flex items-center gap-2"
                          >
                            <Trash2 size={16} />
                            حذف
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                {(repairDebts || []).filter(debt =>
                  debt.customer_name.toLowerCase().includes(debtsSearchTerm.toLowerCase()) ||
                  debt.customer_phone.includes(debtsSearchTerm) ||
                  debt.phone_model.toLowerCase().includes(debtsSearchTerm.toLowerCase())
                ).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg">لا توجد ديون صيانة</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}



      {/* PARTS VIEW (قطع الغيار) */}
      {currentView === "parts" && (
        <>
          <div className="max-w-7xl mx-auto">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">📦 قطع الغيار المتوفرة</h3>
              
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setShowAddPart(true)}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-all font-bold flex items-center gap-2"
                >
                  <Plus size={20} />
                  إضافة قطعة غيار
                </button>
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="ابحث عن موديل أو قطعة..."
                      className="w-full pr-12 pl-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                      value={partSearchTerm}
                      onChange={(e) => setPartSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredParts.map((part) => (
                  <div key={part.id} className="border-2 border-indigo-200 rounded-xl p-4 bg-indigo-50/50 hover:shadow-lg transition-all">
                    {selectedPart?.id === part.id && showEditPart ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          className="w-full px-3 py-2 rounded border"
                          value={selectedPart.phone_model}
                          onChange={(e) => setSelectedPart({ ...selectedPart, phone_model: e.target.value })}
                          placeholder="موديل الهاتف"
                        />
                        <input
                          type="text"
                          className="w-full px-3 py-2 rounded border"
                          value={selectedPart.part_name}
                          onChange={(e) => setSelectedPart({ ...selectedPart, part_name: e.target.value })}
                          placeholder="اسم القطعة"
                        />
                        <input
                          type="number"
                          className="w-full px-3 py-2 rounded border"
                          value={selectedPart.cost}
                          onChange={(e) => setSelectedPart({ ...selectedPart, cost: e.target.value })}
                          placeholder="السعر"
                        />
                        <input
                          type="number"
                          className="w-full px-3 py-2 rounded border"
                          value={selectedPart.quantity}
                          onChange={(e) => setSelectedPart({ ...selectedPart, quantity: e.target.value })}
                          placeholder="الكمية"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await axios.put(
                                  `${API}/parts/${part.id}?phone_model=${selectedPart.phone_model}&part_name=${selectedPart.part_name}&cost=${selectedPart.cost}&quantity=${selectedPart.quantity}`,
                                  {},
                                  getAuthHeaders()
                                );
                                toast.success("✓ تم تحديث القطعة");
                                setShowEditPart(false);
                                setSelectedPart(null);
                                fetchData();
                              } catch (error) {
                                toast.error("فشل تحديث القطعة");
                              }
                            }}
                            className="flex-1 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
                          >
                            حفظ
                          </button>
                          <button
                            onClick={() => {
                              setShowEditPart(false);
                              setSelectedPart(null);
                            }}
                            className="flex-1 bg-gray-300 px-3 py-2 rounded hover:bg-gray-400"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mb-3">
                          <p className="text-sm text-gray-600">الموديل</p>
                          <p className="font-bold text-indigo-600">{part.phone_model}</p>
                        </div>
                        <div className="mb-3">
                          <p className="text-sm text-gray-600">القطعة</p>
                          <p className="font-medium">{part.part_name}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div>
                            <p className="text-sm text-gray-600">السعر</p>
                            <p className="font-bold text-green-600">{part.cost?.toLocaleString()} د.ع</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">الكمية</p>
                            <p className="font-bold text-blue-600">{part.quantity}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedPart(part);
                              setShowEditPart(true);
                            }}
                            className="flex-1 bg-yellow-500 text-white px-3 py-2 rounded-lg hover:bg-yellow-600 text-sm"
                          >
                            <Edit size={14} className="inline ml-1" />
                            تعديل
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm("هل أنت متأكد من الحذف؟")) {
                                try {
                                  await axios.delete(`${API}/parts/${part.id}`, getAuthHeaders());
                                  toast.success("✓ تم حذف القطعة");
                                  fetchData();
                                } catch (error) {
                                  toast.error("فشل حذف القطعة");
                                }
                              }
                            }}
                            className="flex-1 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 text-sm"
                          >
                            <Trash2 size={14} className="inline ml-1" />
                            حذف
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {filteredParts.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">لا توجد قطع غيار</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}



      {/* Add Debt Modal */}
      {showAddDebt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8">
            <h2 className="text-3xl font-bold mb-6 text-red-600">إضافة دين صيانة جديد</h2>
            <form onSubmit={handleCreateDebt} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">اسم الزبون *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-red-400"
                    value={newDebt.customer_name}
                    onChange={(e) => setNewDebt({ ...newDebt, customer_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">رقم الهاتف *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-red-400"
                    value={newDebt.customer_phone}
                    onChange={(e) => setNewDebt({ ...newDebt, customer_phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">موديل الهاتف *</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-red-400"
                  value={newDebt.phone_model}
                  onChange={(e) => setNewDebt({ ...newDebt, phone_model: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">وصف العطل *</label>
                <textarea
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-red-400"
                  rows="3"
                  value={newDebt.issue_description}
                  onChange={(e) => setNewDebt({ ...newDebt, issue_description: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">تكلفة الإصلاح (د.ع) *</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-red-400"
                    value={newDebt.repair_cost}
                    onChange={(e) => setNewDebt({ ...newDebt, repair_cost: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">المبلغ المدفوع (د.ع)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-red-400"
                    value={newDebt.paid_amount}
                    onChange={(e) => setNewDebt({ ...newDebt, paid_amount: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">تاريخ الاستحقاق</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-red-400"
                  value={newDebt.due_date}
                  onChange={(e) => setNewDebt({ ...newDebt, due_date: e.target.value })}
                />
              </div>

              <div className="flex gap-4">
                <button type="submit" className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-all font-bold">
                  حفظ دين الصيانة
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDebt(false);
                    setNewDebt({
                      customer_name: "",
                      customer_phone: "",
                      phone_model: "",
                      issue_description: "",
                      repair_cost: "",
                      parts_used: [],
                      paid_amount: "",
                      due_date: "",
                      customer_telegram_id: ""
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

      {/* Edit Debt Modal */}
      {showEditDebt && selectedDebt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8">
            <h2 className="text-3xl font-bold mb-6 text-red-600">تعديل دين الصيانة</h2>
            <form onSubmit={handleUpdateDebt} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">اسم الزبون *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-red-400"
                    value={selectedDebt.customer_name}
                    onChange={(e) => setSelectedDebt({ ...selectedDebt, customer_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">رقم الهاتف *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-red-400"
                    value={selectedDebt.customer_phone}
                    onChange={(e) => setSelectedDebt({ ...selectedDebt, customer_phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">موديل الهاتف *</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-red-400"
                  value={selectedDebt.phone_model}
                  onChange={(e) => setSelectedDebt({ ...selectedDebt, phone_model: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">وصف العطل *</label>
                <textarea
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-red-400"
                  rows="3"
                  value={selectedDebt.issue_description}
                  onChange={(e) => setSelectedDebt({ ...selectedDebt, issue_description: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">تكلفة الإصلاح (د.ع) *</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-red-400"
                    value={selectedDebt.repair_cost}
                    onChange={(e) => setSelectedDebt({ ...selectedDebt, repair_cost: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">المبلغ المدفوع (د.ع)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-red-400"
                    value={selectedDebt.paid_amount}
                    onChange={(e) => setSelectedDebt({ ...selectedDebt, paid_amount: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button type="submit" className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-all font-bold">
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditDebt(false);
                    setSelectedDebt(null);
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

      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <h2 className="text-3xl font-bold mb-6 text-indigo-600">⚙️ الإعدادات</h2>
            
            {/* Change Password Section */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <h3 className="text-xl font-bold mb-4 text-gray-800">تغيير كلمة المرور</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">كلمة المرور القديمة</label>
                  <input
                    type="password"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                    value={settings.old_password}
                    onChange={(e) => setSettings({ ...settings, old_password: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                    value={settings.new_password}
                    onChange={(e) => setSettings({ ...settings, new_password: e.target.value })}
                  />
                </div>

                <button
                  onClick={handleChangePassword}
                  className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-all font-bold"
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
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                    value={settings.new_username}
                    onChange={(e) => setSettings({ ...settings, new_username: e.target.value })}
                    placeholder={"اسم المستخدم الحالي: " + user.username}
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

            {/* Telegram ID Section */}
            {user.role === 'admin' && (
              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="text-indigo-600" size={20} />
                  <h3 className="text-xl font-bold text-gray-800">Telegram ID للإشعارات</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  أضف Telegram Chat ID الخاص بك لتلقي جميع إشعارات النظام
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Telegram Chat ID</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-indigo-400"
                      value={settings.telegram_chat_id}
                      onChange={(e) => setSettings({ ...settings, telegram_chat_id: e.target.value })}
                      placeholder="مثال: 123456789"
                    />
                  </div>
                  
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                    <p className="text-xs text-indigo-800 font-bold mb-2">📱 كيفية الحصول على Chat ID:</p>
                    <ol className="text-xs text-indigo-700 space-y-1 mr-4">
                      <li>1. افتح Telegram وابحث عن: <strong>@userinfobot</strong></li>
                      <li>2. اضغط Start</li>
                      <li>3. سيرسل لك Chat ID الخاص بك</li>
                    </ol>
                  </div>

                  <button
                    onClick={handleUpdateTelegramId}
                    className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-all font-bold"
                  >
                    حفظ Telegram ID
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowSettings(false)}
              className="w-full bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-all font-bold"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhoneRepairSystemFull;