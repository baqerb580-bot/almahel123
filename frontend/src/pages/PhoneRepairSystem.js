import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  Smartphone, TrendingUp, DollarSign, Wrench, Plus, Search, 
  LogOut, Package, Calendar, User
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PhoneRepairSystem = ({ user, onLogout }) => {
  const [repairs, setRepairs] = useState([]);
  const [parts, setParts] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddRepair, setShowAddRepair] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState("monthly");
  
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

  const [newPart, setNewPart] = useState({ name: "", cost: "" });

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [searchTerm, statsPeriod]);

  const fetchData = async () => {
    try {
      const [repairsRes, partsRes, statsRes] = await Promise.all([
        axios.get(`${API}/repairs?search=${searchTerm}`, getAuthHeaders()),
        axios.get(`${API}/parts`, getAuthHeaders()),
        axios.get(`${API}/repairs/stats?period=${statsPeriod}`, getAuthHeaders())
      ]);
      setRepairs(repairsRes.data);
      setParts(partsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleCreateRepair = async (e) => {
    e.preventDefault();
    
    try {
      const repairData = {
        ...newRepair,
        repair_cost: parseFloat(newRepair.repair_cost),
        paid_amount: parseFloat(newRepair.paid_amount || 0),
        due_date: newRepair.due_date || null
      };
      
      await axios.post(`${API}/repairs`, repairData, getAuthHeaders());
      toast.success("تم إضافة الصيانة بنجاح");
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
      toast.error(error.response?.data?.detail || "فشل إضافة الصيانة");
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
            <button onClick={onLogout} className="bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all shadow-lg">
              <LogOut className="inline ml-2" size={20} />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>

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
                <p className="text-2xl font-bold text-green-600">{stats.total_revenue?.toLocaleString()} د.ع</p>
              </div>
              <DollarSign size={40} className="text-green-400" />
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">الربح الصافي</p>
                <p className="text-2xl font-bold text-purple-600">{stats.total_profit?.toLocaleString()} د.ع</p>
              </div>
              <TrendingUp size={40} className="text-purple-400" />
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl hover:scale-105 transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">المتبقي</p>
                <p className="text-2xl font-bold text-orange-600">{stats.total_remaining?.toLocaleString()} د.ع</p>
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
          {repairs.map((repair) => (
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
              </div>
            </div>
          ))}
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
    </div>
  );
};

export default PhoneRepairSystem;
