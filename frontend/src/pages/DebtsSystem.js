import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  DollarSign, Users, AlertCircle, CheckCircle, Plus, Search, 
  LogOut, Settings as SettingsIcon, Trash2, Receipt, Bell
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DebtsSystem = ({ user, onLogout }) => {
  const [debts, setDebts] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  
  const [newDebt, setNewDebt] = useState({
    customer_name: "",
    customer_phone: "",
    product_description: "",
    total_amount: "",
    paid_amount: "",
    due_date: "",
    customer_telegram_id: ""
  });

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [searchTerm, filterStatus]);

  const fetchData = async () => {
    try {
      const [debtsRes, statsRes] = await Promise.all([
        axios.get(`${API}/debts?search=${searchTerm}&status=${filterStatus !== 'all' ? filterStatus : ''}`, getAuthHeaders()),
        axios.get(`${API}/debts/stats`, getAuthHeaders())
      ]);
      setDebts(debtsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleCreateDebt = async (e) => {
    e.preventDefault();
    
    try {
      // تحديد تاريخ الاستحقاق تلقائياً (30 يوم من الآن)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      const debtData = {
        ...newDebt,
        total_amount: parseFloat(newDebt.total_amount),
        paid_amount: parseFloat(newDebt.paid_amount || 0),
        due_date: newDebt.due_date || dueDate.toISOString()
      };
      
      await axios.post(`${API}/debts`, debtData, getAuthHeaders());
      toast.success("تم إضافة الدين بنجاح");
      setShowAddDebt(false);
      setNewDebt({
        customer_name: "",
        customer_phone: "",
        product_description: "",
        total_amount: "",
        paid_amount: "",
        due_date: "",
        customer_telegram_id: ""
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل إضافة الدين");
    }
  };

  const handlePayment = async (debtId) => {
    const amount = prompt("أدخل المبلغ المراد تسديده:");
    if (!amount || isNaN(amount)) return;
    
    try {
      await axios.post(`${API}/debts/${debtId}/pay`, {
        debt_id: debtId,
        amount: parseFloat(amount)
      }, getAuthHeaders());
      toast.success("تم تسجيل الدفعة بنجاح");
      fetchData();
    } catch (error) {
      toast.error("فشل تسجيل الدفعة");
    }
  };

  const viewCustomerDebts = async (phone) => {
    try {
      const response = await axios.get(`${API}/debts/customer/${phone}`, getAuthHeaders());
      setSelectedCustomer(response.data);
    } catch (error) {
      toast.error("فشل جلب بيانات الزبون");
    }
  };

  const getStatusBadge = (debt) => {
    const now = new Date();
    const dueDate = new Date(debt.due_date);
    
    if (debt.status === "paid") {
      return <span className="px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-700">✓ مسدد</span>;
    } else if (debt.status === "overdue" || now > dueDate) {
      return <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-700 animate-pulse">⚠ متأخر</span>;
    } else {
      return <span className="px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-700">◉ نشط</span>;
    }
  };

  const getDaysRemaining = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    
    if (diff < 0) {
      return <span className="text-red-600 font-bold">متأخر {Math.abs(diff)} يوم</span>;
    } else if (diff <= 7) {
      return <span className="text-orange-600 font-bold">باقي {diff} يوم</span>;
    } else {
      return <span className="text-gray-600">باقي {diff} يوم</span>;
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-bold mb-2 text-white drop-shadow-lg" style={{ fontFamily: 'Cairo, sans-serif' }}>
              💰 نظام إدارة الديون
            </h1>
            <p className="text-white/90 text-lg">مرحباً، {user.name}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onLogout} className="bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all shadow-lg">
              <LogOut className="inline ml-2" size={20} />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">إجمالي الديون</p>
                <p className="text-3xl font-bold text-purple-600">{stats.total_debts}</p>
              </div>
              <Users size={40} className="text-purple-400" />
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">المتأخرة</p>
                <p className="text-3xl font-bold text-red-600">{stats.overdue_debts}</p>
              </div>
              <AlertCircle size={40} className="text-red-400" />
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">المبلغ المتبقي</p>
                <p className="text-2xl font-bold text-orange-600">{stats.total_remaining?.toLocaleString()} د.ع</p>
              </div>
              <DollarSign size={40} className="text-orange-400" />
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">المسدد</p>
                <p className="text-2xl font-bold text-green-600">{stats.total_paid?.toLocaleString()} د.ع</p>
              </div>
              <CheckCircle size={40} className="text-green-400" />
            </div>
          </div>
        </div>
      )}

      {/* Actions & Search */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-wrap gap-4">
        <button
          onClick={() => setShowAddDebt(true)}
          className="bg-white text-purple-600 px-6 py-3 rounded-xl hover:shadow-xl transition-all font-bold flex items-center gap-2"
        >
          <Plus size={20} />
          إضافة دين جديد
        </button>

        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="ابحث عن زبون (اسم أو رقم)..."
              className="w-full pr-12 pl-4 py-3 rounded-xl border-2 border-white/50 bg-white/90 backdrop-blur-md focus:outline-none focus:border-purple-400 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <select
          className="px-6 py-3 rounded-xl border-2 border-white/50 bg-white/90 backdrop-blur-md focus:outline-none focus:border-purple-400 transition-all"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">جميع الحالات</option>
          <option value="active">نشط</option>
          <option value="overdue">متأخر</option>
          <option value="paid">مسدد</option>
        </select>
      </div>

      {/* Debts List */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 gap-4">
          {debts.map((debt) => (
            <div 
              key={debt.id} 
              className={`bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all ${
                debt.status === 'overdue' ? 'border-4 border-red-400' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-gray-800">{debt.customer_name}</h3>
                    {getStatusBadge(debt)}
                  </div>
                  <p className="text-gray-600 mb-1">📞 {debt.customer_phone}</p>
                  <p className="text-gray-700 font-medium">🛍️ {debt.product_description}</p>
                </div>
                <div className="text-left">
                  <p className="text-3xl font-bold text-purple-600 mb-1">{debt.remaining_amount.toLocaleString()} د.ع</p>
                  <p className="text-sm text-gray-500">من أصل {debt.total_amount.toLocaleString()} د.ع</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div>
                  <p className="text-sm text-gray-600">📅 تاريخ الاستحقاق: {new Date(debt.due_date).toLocaleDateString('ar-IQ')}</p>
                  <p className="text-sm">{getDaysRemaining(debt.due_date)}</p>
                </div>
                <div className="flex gap-2">
                  {debt.remaining_amount > 0 && (
                    <button
                      onClick={() => handlePayment(debt.id)}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all flex items-center gap-2"
                    >
                      <DollarSign size={18} />
                      تسديد
                    </button>
                  )}
                  <button
                    onClick={() => viewCustomerDebts(debt.customer_phone)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all flex items-center gap-2"
                  >
                    <Receipt size={18} />
                    التفاصيل
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Debt Modal */}
      {showAddDebt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <h2 className="text-3xl font-bold mb-6 text-purple-600">إضافة دين جديد</h2>
            <form onSubmit={handleCreateDebt} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">اسم الزبون *</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                  value={newDebt.customer_name}
                  onChange={(e) => setNewDebt({ ...newDebt, customer_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">رقم الهاتف *</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                  value={newDebt.customer_phone}
                  onChange={(e) => setNewDebt({ ...newDebt, customer_phone: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">وصف السلعة *</label>
                <textarea
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                  rows="3"
                  value={newDebt.product_description}
                  onChange={(e) => setNewDebt({ ...newDebt, product_description: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">المبلغ الكلي (د.ع) *</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                    value={newDebt.total_amount}
                    onChange={(e) => setNewDebt({ ...newDebt, total_amount: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">المبلغ المدفوع (د.ع)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                    value={newDebt.paid_amount}
                    onChange={(e) => setNewDebt({ ...newDebt, paid_amount: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">تاريخ الاستحقاق</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                  value={newDebt.due_date}
                  onChange={(e) => setNewDebt({ ...newDebt, due_date: e.target.value })}
                />
                <p className="text-sm text-gray-500 mt-1">إذا تركت فارغاً، سيتم تحديد 30 يوم من اليوم</p>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Telegram Chat ID للزبون (اختياري)</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                  value={newDebt.customer_telegram_id}
                  onChange={(e) => setNewDebt({ ...newDebt, customer_telegram_id: e.target.value })}
                  placeholder="لإرسال إشعارات للزبون"
                />
              </div>

              {newDebt.total_amount && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-lg font-bold text-purple-700">
                    المبلغ المتبقي: {(parseFloat(newDebt.total_amount || 0) - parseFloat(newDebt.paid_amount || 0)).toLocaleString()} د.ع
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                <button type="submit" className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-all font-bold">
                  إضافة الدين
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddDebt(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-all font-bold"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-purple-600">تفاصيل الزبون</h2>
              <button onClick={() => setSelectedCustomer(null)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <div className="space-y-4">
              {selectedCustomer.map((debt) => (
                <div key={debt.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg">{debt.product_description}</h3>
                      <p className="text-sm text-gray-600">📅 {new Date(debt.created_at).toLocaleString('ar-IQ')}</p>
                    </div>
                    {getStatusBadge(debt)}
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-3">
                    <div>
                      <p className="text-sm text-gray-600">المبلغ الكلي</p>
                      <p className="font-bold">{debt.total_amount.toLocaleString()} د.ع</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">المدفوع</p>
                      <p className="font-bold text-green-600">{debt.paid_amount.toLocaleString()} د.ع</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">المتبقي</p>
                      <p className="font-bold text-red-600">{debt.remaining_amount.toLocaleString()} د.ع</p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="bg-purple-100 rounded-lg p-4 mt-4">
                <p className="text-lg font-bold text-purple-700">
                  إجمالي الديون: {selectedCustomer.reduce((sum, d) => sum + d.remaining_amount, 0).toLocaleString()} د.ع
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebtsSystem;
