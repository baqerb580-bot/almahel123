import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { 
  DollarSign, Users, AlertCircle, CheckCircle, Plus, Search, 
  LogOut, Settings as SettingsIcon, Trash2, Receipt, Edit, Printer, UserPlus, Shield, MessageCircle
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PERMISSIONS = [
  { id: 'add_debt', name: 'إضافة ديون' },
  { id: 'edit_debt', name: 'تعديل ديون' },
  { id: 'delete_debt', name: 'حذف ديون' },
  { id: 'payment', name: 'تسديد ديون' },
  { id: 'view_details', name: 'عرض التفاصيل' },
  { id: 'print', name: 'طباعة' },
  { id: 'view_stats', name: 'عرض الإحصائيات' }
];

const DebtsSystemFinal = ({ user, onLogout }) => {
  const [debts, setDebts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [showEditDebt, setShowEditDebt] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showEmployeesList, setShowEmployeesList] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDebt, setPaymentDebt] = useState(null);
  
  const [newDebt, setNewDebt] = useState({
    customer_name: "",
    customer_phone: "",
    product_description: "",
    total_amount: "",
    paid_amount: "",
    created_date: "",
    due_date: "",
    customer_telegram_id: ""
  });

  const [newEmployee, setNewEmployee] = useState({
    username: "",
    name: "",
    password: "",
    permissions: [],
    telegram_chat_id: ""
  });

  const [settings, setSettings] = useState({
    old_password: "",
    new_password: "",
    new_username: "",
    telegram_chat_id: user.telegram_chat_id || ""
  });

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });

  const hasPermission = (permission) => {
    if (user.role === 'admin') return true;
    return user.permissions && user.permissions.includes(permission);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterStatus]);

  const fetchData = async () => {
    try {
      const requests = [
        axios.get(`${API}/debts?search=${searchTerm}&status=${filterStatus !== 'all' ? filterStatus : ''}`, getAuthHeaders()),
        axios.get(`${API}/debts/stats`, getAuthHeaders())
      ];
      
      if (user.role === 'admin') {
        requests.push(axios.get(`${API}/users`, getAuthHeaders()));
      }
      
      const responses = await Promise.all(requests);
      setDebts(responses[0].data);
      setStats(responses[1].data);
      if (responses[2]) {
        setEmployees(responses[2].data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleCreateDebt = async (e) => {
    e.preventDefault();
    
    if (!hasPermission('add_debt')) {
      toast.error("ليس لديك صلاحية إضافة ديون");
      return;
    }
    
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      const debtData = {
        customer_name: newDebt.customer_name,
        customer_phone: newDebt.customer_phone,
        product_description: newDebt.product_description,
        total_amount: parseFloat(newDebt.total_amount),
        paid_amount: parseFloat(newDebt.paid_amount || 0),
        due_date: newDebt.due_date || dueDate.toISOString().split('T')[0],
        customer_telegram_id: newDebt.customer_telegram_id || ""
      };
      
      console.log("Sending debt data:", debtData);
      
      await axios.post(`${API}/debts`, debtData, getAuthHeaders());
      toast.success("✓ تم إضافة الدين بنجاح");
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
      console.error("Error adding debt:", error);
      toast.error(error.response?.data?.detail || "فشل إضافة الدين");
    }
  };

  const handleUpdateDebt = async (e) => {
    e.preventDefault();
    
    if (!hasPermission('edit_debt')) {
      toast.error("ليس لديك صلاحية تعديل الديون");
      return;
    }
    
    try {
      await axios.put(`${API}/debts/${selectedDebt.id}`, {
        ...selectedDebt,
        total_amount: parseFloat(selectedDebt.total_amount),
        paid_amount: parseFloat(selectedDebt.paid_amount)
      }, getAuthHeaders());
      toast.success("✓ تم تحديث الدين بنجاح");
      setShowEditDebt(false);
      setSelectedDebt(null);
      fetchData();
    } catch (error) {
      toast.error("فشل تحديث الدين");
    }
  };

  const handleDeleteDebt = async (debtId) => {
    if (!hasPermission('delete_debt')) {
      toast.error("ليس لديك صلاحية حذف الديون");
      return;
    }
    
    if (!window.confirm("هل أنت متأكد من حذف هذا الدين؟")) return;
    
    try {
      await axios.delete(`${API}/debts/${debtId}`, getAuthHeaders());
      toast.success("✓ تم حذف الدين بنجاح");
      fetchData();
    } catch (error) {
      toast.error("فشل حذف الدين");
    }
  };

  const handlePayment = async (debt) => {
    if (!hasPermission('payment')) {
      toast.error("ليس لديك صلاحية تسديد الديون");
      return;
    }
    
    setPaymentDebt(debt);
    setPaymentAmount("");
    setShowPaymentModal(true);
  };
  
  const submitPayment = async () => {
    if (!paymentAmount || isNaN(paymentAmount) || parseFloat(paymentAmount) <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }
    
    try {
      await axios.post(`${API}/debts/${paymentDebt.id}/pay`, {
        debt_id: paymentDebt.id,
        amount: parseFloat(paymentAmount)
      }, getAuthHeaders());
      toast.success("✓ تم تسجيل الدفعة بنجاح");
      setShowPaymentModal(false);
      setPaymentDebt(null);
      setPaymentAmount("");
      fetchData();
    } catch (error) {
      toast.error("فشل تسجيل الدفعة");
    }
  };

  const sendWhatsAppReminder = (debt) => {
    // تنظيف رقم الهاتف
    let cleanNumber = debt.customer_phone.replace(/[^0-9]/g, '');
    
    // إضافة 964 إذا بدأ بـ 07
    if (cleanNumber.startsWith('07')) {
      cleanNumber = '964' + cleanNumber.substring(1);
    }
    
    // الرسالة الجاهزة
    const message = `مرحباً ${debt.customer_name}،

🔔 *تذكير بالدين المستحق*

🛍️ *السلعة:* ${debt.product_description}
💰 *المبلغ الكلي:* ${debt.total_amount.toLocaleString()} دينار عراقي
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

  const viewCustomerDebts = async (phone) => {
    if (!hasPermission('view_details')) {
      toast.error("ليس لديك صلاحية عرض التفاصيل");
      return;
    }
    
    try {
      const response = await axios.get(`${API}/debts/customer/${phone}`, getAuthHeaders());
      setSelectedCustomer(response.data);
    } catch (error) {
      toast.error("فشل جلب بيانات الزبون");
    }
  };

  const handlePrint = (debt) => {
    if (!hasPermission('print')) {
      toast.error("ليس لديك صلاحية الطباعة");
      return;
    }
    
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>وصل دين - ${debt.customer_name}</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Arial', sans-serif; direction: rtl; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #333; }
            .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px; background: #f5f5f5; }
            .info-label { font-weight: bold; }
            .total-section { margin-top: 30px; border-top: 2px solid #000; padding-top: 15px; }
            .amount-box { background: #e8f5e9; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .amount-box.remaining { background: #ffebee; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
            @media print {
              body { margin: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🧾 وصل دين</h1>
            <p>التاريخ: ${new Date().toLocaleDateString('ar-IQ')}</p>
          </div>
          
          <div class="info-row">
            <div><span class="info-label">اسم الزبون:</span> ${debt.customer_name}</div>
            <div><span class="info-label">رقم الهاتف:</span> ${debt.customer_phone}</div>
          </div>
          
          <div class="info-row">
            <div><span class="info-label">وصف السلعة:</span> ${debt.product_description}</div>
          </div>
          
          <div class="total-section">
            <div class="amount-box">
              <h3>💰 المبلغ الإجمالي: ${debt.total_amount.toLocaleString()} دينار عراقي</h3>
            </div>
            
            <div class="amount-box">
              <h3>✓ المبلغ المسدد: ${debt.paid_amount.toLocaleString()} دينار عراقي</h3>
            </div>
            
            <div class="amount-box remaining">
              <h3>⚠ المبلغ المتبقي: ${debt.remaining_amount.toLocaleString()} دينار عراقي</h3>
            </div>
          </div>
          
          <div class="info-row">
            <div><span class="info-label">تاريخ الاستحقاق:</span> ${new Date(debt.due_date).toLocaleDateString('ar-IQ')}</div>
            <div><span class="info-label">الحالة:</span> ${debt.status === 'paid' ? 'مسدد' : debt.status === 'overdue' ? 'متأخر' : 'نشط'}</div>
          </div>
          
          ${debt.payments && debt.payments.length > 0 ? `
            <div style="margin-top: 20px;">
              <h3>سجل الدفعات:</h3>
              ${debt.payments.map(p => `
                <div class="info-row">
                  <span>${new Date(p.date).toLocaleDateString('ar-IQ')} - ${new Date(p.date).toLocaleTimeString('ar-IQ')}</span>
                  <span><strong>${p.amount.toLocaleString()} د.ع</strong></span>
                  <span>${p.by}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <div class="footer">
            <p>تم إصدار هذا الوصل بتاريخ ${new Date().toLocaleString('ar-IQ')}</p>
            <p>نشكركم على تعاملكم معنا</p>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px; cursor: pointer;">طباعة</button>
            <button onclick="window.close()" style="padding: 10px 30px; font-size: 16px; cursor: pointer; margin-right: 10px;">إغلاق</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post(`${API}/users`, {
        ...newEmployee,
        role: 'employee',
        system: user.system
      }, getAuthHeaders());
      toast.success("✓ تم إضافة الموظف بنجاح");
      setShowAddEmployee(false);
      setNewEmployee({
        username: "",
        name: "",
        password: "",
        permissions: [],
        telegram_chat_id: ""
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل إضافة الموظف");
    }
  };

  const handleDeleteEmployee = async (userId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الموظف؟")) return;
    
    try {
      await axios.delete(`${API}/users/${userId}`, getAuthHeaders());
      toast.success("✓ تم حذف الموظف بنجاح");
      fetchData();
    } catch (error) {
      toast.error("فشل حذف الموظف");
    }
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
      setSettings({ old_password: "", new_password: "", new_username: "", telegram_chat_id: settings.telegram_chat_id });
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل تغيير كلمة المرور");
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

  const togglePermission = (permissionId) => {
    const current = newEmployee.permissions;
    if (current.includes(permissionId)) {
      setNewEmployee({
        ...newEmployee,
        permissions: current.filter(p => p !== permissionId)
      });
    } else {
      setNewEmployee({
        ...newEmployee,
        permissions: [...current, permissionId]
      });
    }
  };

  const selectAllPermissions = () => {
    setNewEmployee({
      ...newEmployee,
      permissions: PERMISSIONS.map(p => p.id)
    });
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

  const filteredDebts = searchTerm 
    ? (debts || []).filter(d => 
        d.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.customer_phone.includes(searchTerm)
      )
    : (debts || []);

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-bold mb-2 text-white drop-shadow-lg" style={{ fontFamily: 'Cairo, sans-serif' }}>
              💰 نظام إدارة الديون
            </h1>
            <p className="text-white/90 text-lg">مرحباً، {user.name} {user.role === 'admin' ? '(مدير)' : '(موظف)'}</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowSettings(true)} 
              className="bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all shadow-lg"
              data-testid="settings-button"
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
      {stats && hasPermission('view_stats') && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div 
            onClick={() => setFilterStatus('all')}
            className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl hover:scale-105 transition-transform cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">إجمالي الديون</p>
                <p className="text-3xl font-bold text-purple-600">{stats.total_debts}</p>
              </div>
              <Users size={40} className="text-purple-400" />
            </div>
          </div>

          <div 
            onClick={() => setFilterStatus('overdue')}
            className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl hover:scale-105 transition-transform cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">المتأخرة</p>
                <p className="text-3xl font-bold text-red-600">{stats.overdue_debts}</p>
              </div>
              <AlertCircle size={40} className="text-red-400" />
            </div>
          </div>

          <div 
            onClick={() => setFilterStatus('active')}
            className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl hover:scale-105 transition-transform cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">المبلغ المتبقي</p>
                <p className="text-2xl font-bold text-orange-600">{stats.total_remaining?.toLocaleString()} د.ع</p>
              </div>
              <DollarSign size={40} className="text-orange-400" />
            </div>
          </div>

          <div 
            onClick={() => setFilterStatus('paid')}
            className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl hover:scale-105 transition-transform cursor-pointer"
          >
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

      {/* Search & Actions */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
          {hasPermission('add_debt') && (
            <button
              onClick={() => setShowAddDebt(true)}
              className="bg-white text-purple-600 px-6 py-3 rounded-xl hover:shadow-xl transition-all font-bold flex items-center gap-2"
              data-testid="add-debt-button"
            >
              <Plus size={20} />
              إضافة دين جديد
            </button>
          )}

          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
              <input
                type="text"
                placeholder="🔍 ابحث عن زبون (اسم أو رقم)..."
                className="w-full pr-14 pl-4 py-4 rounded-xl border-2 border-white/50 bg-white/90 backdrop-blur-md focus:outline-none focus:border-purple-400 transition-all text-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="search-input"
              />
            </div>
          </div>

          <select
            className="px-6 py-4 rounded-xl border-2 border-white/50 bg-white/90 backdrop-blur-md focus:outline-none focus:border-purple-400 transition-all"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="overdue">متأخر</option>
            <option value="paid">مسدد</option>
          </select>
        </div>
      </div>

      {/* Debts List */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 gap-4">
          {filteredDebts && filteredDebts.length > 0 ? (
            filteredDebts.map((debt) => (
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

              <div className="flex flex-wrap justify-between items-center pt-4 border-t border-gray-200 gap-2">
                <div>
                  <p className="text-sm text-gray-600">📅 تاريخ الاستحقاق: {new Date(debt.due_date).toLocaleDateString('ar-IQ')}</p>
                  <p className="text-sm">{getDaysRemaining(debt.due_date)}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {hasPermission('print') && (
                    <button
                      onClick={() => handlePrint(debt)}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all flex items-center gap-2"
                      data-testid="print-button"
                    >
                      <Printer size={18} />
                      طباعة
                    </button>
                  )}
                  {hasPermission('payment') && debt.remaining_amount > 0 && (
                    <>
                      <button
                        onClick={() => handlePayment(debt)}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all flex items-center gap-2"
                      >
                        <DollarSign size={18} />
                        تسديد
                      </button>
                      <button
                        onClick={() => sendWhatsAppReminder(debt)}
                        className="bg-emerald-500 text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-all flex items-center gap-2"
                        title="إرسال تذكير عبر WhatsApp"
                      >
                        <MessageCircle size={18} />
                        واتساب
                      </button>
                    </>
                  )}
                  {hasPermission('edit_debt') && (
                    <button
                      onClick={() => {
                        setSelectedDebt(debt);
                        setShowEditDebt(true);
                      }}
                      className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-all flex items-center gap-2"
                      data-testid="edit-button"
                    >
                      <Edit size={18} />
                      تعديل
                    </button>
                  )}
                  {hasPermission('view_details') && (
                    <button
                      onClick={() => viewCustomerDebts(debt.customer_phone)}
                      className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-all flex items-center gap-2"
                    >
                      <Receipt size={18} />
                      التفاصيل
                    </button>
                  )}
                  {hasPermission('delete_debt') && (
                    <button
                      onClick={() => handleDeleteDebt(debt.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all flex items-center gap-2"
                      data-testid="delete-button"
                    >
                      <Trash2 size={18} />
                      حذف
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
          ) : (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-12 text-center shadow-xl">
              <p className="text-gray-500 text-xl">لا توجد ديون حالياً</p>
              <p className="text-gray-400 mt-2">اضغط على "إضافة دين جديد" لإضافة دين</p>
            </div>
          )}
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
                <label className="block text-gray-700 font-medium mb-2">تاريخ أخذ الدين</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                  value={newDebt.created_date ? new Date(newDebt.created_date).toISOString().split('T')[0] : ''}
                  onChange={(e) => setNewDebt({ ...newDebt, created_date: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">تاريخ موعد التسديد</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                  value={newDebt.due_date ? new Date(newDebt.due_date).toISOString().split('T')[0] : ''}
                  onChange={(e) => setNewDebt({ ...newDebt, due_date: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                />
                <p className="text-sm text-gray-500 mt-1">إذا تركت فارغاً، سيتم تحديد 30 يوم من اليوم</p>
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

      {/* Edit Debt Modal */}
      {showEditDebt && selectedDebt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <h2 className="text-3xl font-bold mb-6 text-purple-600">تعديل الدين</h2>
            <form onSubmit={handleUpdateDebt} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">اسم الزبون *</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                  value={selectedDebt.customer_name}
                  onChange={(e) => setSelectedDebt({ ...selectedDebt, customer_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">رقم الهاتف *</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                  value={selectedDebt.customer_phone}
                  onChange={(e) => setSelectedDebt({ ...selectedDebt, customer_phone: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">وصف السلعة *</label>
                <textarea
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                  rows="3"
                  value={selectedDebt.product_description}
                  onChange={(e) => setSelectedDebt({ ...selectedDebt, product_description: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">المبلغ الكلي (د.ع) *</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                    value={selectedDebt.total_amount}
                    onChange={(e) => setSelectedDebt({ ...selectedDebt, total_amount: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">المبلغ المدفوع (د.ع)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                    value={selectedDebt.paid_amount}
                    onChange={(e) => setSelectedDebt({ ...selectedDebt, paid_amount: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button type="submit" className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-all font-bold">
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

            {/* Telegram ID Section - Admin Only */}
            {user.role === 'admin' && (
              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="text-purple-600" size={20} />
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
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                      value={settings.telegram_chat_id}
                      onChange={(e) => setSettings({ ...settings, telegram_chat_id: e.target.value })}
                      placeholder="مثال: 123456789"
                    />
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <p className="text-xs text-purple-800 font-bold mb-2">📱 كيفية الحصول على Chat ID:</p>
                    <ol className="text-xs text-purple-700 space-y-1 mr-4">
                      <li>1. افتح Telegram وابحث عن: <strong>@userinfobot</strong></li>
                      <li>2. اضغط Start</li>
                      <li>3. سيرسل لك Chat ID الخاص بك</li>
                    </ol>
                  </div>

                  <button
                    onClick={handleUpdateTelegramId}
                    className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-all font-bold"
                  >
                    حفظ Telegram ID
                  </button>
                </div>
              </div>
            )}

            {/* Add Employee Section - Admin Only */}
            {user.role === 'admin' && (
              <>
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <h3 className="text-xl font-bold mb-4 text-gray-800">إدارة الموظفين</h3>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowAddEmployee(true)}
                      className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-all font-bold flex items-center justify-center gap-2"
                    >
                      <UserPlus size={20} />
                      إضافة موظف
                    </button>
                    <button
                      onClick={() => setShowEmployeesList(true)}
                      className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-all font-bold flex items-center justify-center gap-2"
                    >
                      <Users size={20} />
                      قائمة الموظفين ({employees.filter(e => e.role === 'employee').length})
                    </button>
                  </div>
                </div>
              </>
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

      {/* Add Employee Modal */}
      {showAddEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8">
            <h2 className="text-3xl font-bold mb-6 text-purple-600">👤 إضافة موظف جديد</h2>
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">اسم المستخدم (Username) *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                    value={newEmployee.username}
                    onChange={(e) => setNewEmployee({ ...newEmployee, username: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">الاسم الكامل *</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">كلمة المرور *</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                  value={newEmployee.password}
                  onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">Telegram Chat ID (اختياري)</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                  value={newEmployee.telegram_chat_id}
                  onChange={(e) => setNewEmployee({ ...newEmployee, telegram_chat_id: e.target.value })}
                  placeholder="لإرسال إشعارات للموظف"
                />
              </div>

              {/* Permissions Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Shield size={24} className="text-purple-600" />
                    الصلاحيات
                  </h3>
                  <button
                    type="button"
                    onClick={selectAllPermissions}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-all text-sm font-bold"
                  >
                    تحديد الكل
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {PERMISSIONS.map((perm) => (
                    <label key={perm.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-200 cursor-pointer hover:border-purple-400 transition-all">
                      <input
                        type="checkbox"
                        checked={newEmployee.permissions.includes(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                        className="w-5 h-5 text-purple-600"
                      />
                      <span className="text-gray-700 font-medium">{perm.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <button type="submit" className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-all font-bold">
                  إضافة الموظف
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddEmployee(false);
                    setNewEmployee({
                      username: "",
                      name: "",
                      password: "",
                      permissions: [],
                      telegram_chat_id: ""
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

      {/* Employees List Modal */}
      {showEmployeesList && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-purple-600">👥 قائمة الموظفين</h2>
              <button onClick={() => setShowEmployeesList(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {employees.filter(e => e.role === 'employee').map((employee) => (
                <div key={employee.id} className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{employee.name}</h3>
                      <p className="text-gray-600">@{employee.username}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteEmployee(employee.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all flex items-center gap-2"
                    >
                      <Trash2 size={16} />
                      حذف
                    </button>
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-sm font-bold text-gray-700 mb-2">الصلاحيات:</p>
                    <div className="flex flex-wrap gap-2">
                      {employee.permissions && employee.permissions.length > 0 ? (
                        employee.permissions.map(permId => {
                          const perm = PERMISSIONS.find(p => p.id === permId);
                          return perm ? (
                            <span key={permId} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                              {perm.name}
                            </span>
                          ) : null;
                        })
                      ) : (
                        <span className="text-gray-500 text-sm">لا توجد صلاحيات</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {employees.filter(e => e.role === 'employee').length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <p className="text-xl">لا يوجد موظفين حالياً</p>
                  <p className="text-sm mt-2">قم بإضافة موظف جديد من الإعدادات</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-purple-600">تفاصيل الزبون</h2>
              <button onClick={() => setSelectedCustomer(null)} className="text-gray-500 hover:text-gray-700 text-2xl">
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

      {/* Payment Modal - Improved Design */}
      {showPaymentModal && paymentDebt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-8">
            <h2 className="text-3xl font-bold mb-6 text-green-600 flex items-center gap-2">
              <DollarSign size={32} />
              تسديد دين
            </h2>
            
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-xl mb-4 text-gray-800">تفاصيل الدين:</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-700">الزبون:</span>
                  <span className="font-bold">{paymentDebt.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">السلعة:</span>
                  <span className="font-bold">{paymentDebt.product_description}</span>
                </div>
                <div className="flex justify-between border-t border-purple-200 pt-2 mt-2">
                  <span className="text-gray-700">المبلغ الكلي:</span>
                  <span className="font-bold text-blue-600">{paymentDebt.total_amount.toLocaleString()} د.ع</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">المدفوع سابقاً:</span>
                  <span className="font-bold text-green-600">{paymentDebt.paid_amount.toLocaleString()} د.ع</span>
                </div>
                <div className="flex justify-between border-t border-purple-200 pt-2 mt-2">
                  <span className="text-gray-800 font-bold text-lg">المتبقي:</span>
                  <span className="font-bold text-red-600 text-2xl">{paymentDebt.remaining_amount.toLocaleString()} د.ع</span>
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
                  max={paymentDebt.remaining_amount}
                  autoFocus
                />
                <span className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-500 text-xl">د.ع</span>
              </div>
              
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setPaymentAmount(paymentDebt.remaining_amount.toString())}
                  className="flex-1 bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-all font-bold"
                >
                  تسديد كامل
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentAmount((paymentDebt.remaining_amount / 2).toString())}
                  className="flex-1 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-all font-bold"
                >
                  نصف المبلغ
                </button>
              </div>
            </div>

            {paymentAmount && parseFloat(paymentAmount) > 0 && (
              <div className="bg-green-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">المبلغ المسدد:</span>
                  <span className="font-bold text-green-600 text-xl">{parseFloat(paymentAmount).toLocaleString()} د.ع</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-green-200">
                  <span className="text-gray-800 font-bold">المتبقي بعد الدفع:</span>
                  <span className="font-bold text-gray-800 text-xl">
                    {(paymentDebt.remaining_amount - parseFloat(paymentAmount || 0)).toLocaleString()} د.ع
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={submitPayment}
                className="flex-1 bg-green-600 text-white px-6 py-4 rounded-lg hover:bg-green-700 transition-all font-bold text-lg flex items-center justify-center gap-2"
              >
                <DollarSign size={24} />
                تسجيل الدفعة
              </button>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentDebt(null);
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

export default DebtsSystemFinal;