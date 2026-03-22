import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { MapPin, Users, CheckCircle, Clock, AlertCircle, Plus, LogOut, Bell, X, Trash2, Play, UserPlus, Settings as SettingsIcon, Send, Star, Edit, MessageCircle, FileText, Eye, DollarSign, CreditCard, Wallet, Calendar } from "lucide-react";
import { playNotificationSound } from "../utils/notificationSound";
import Settings from "./Settings";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = ({ user, onLogout }) => {
  const [tasks, setTasks] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [stats, setStats] = useState(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [locations, setLocations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [modalTasksType, setModalTasksType] = useState("");
  const [modalTasks, setModalTasks] = useState([]);
  const [showAddTechnician, setShowAddTechnician] = useState(false);
  const [showTechniciansModal, setShowTechniciansModal] = useState(false);
  const [showEditPermissions, setShowEditPermissions] = useState(false);
  const [selectedTechForPermissions, setSelectedTechForPermissions] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [selectedTechForPassword, setSelectedTechForPassword] = useState(null);
  const [newPasswordData, setNewPasswordData] = useState({ password: "" });
  const [showWorkSessions, setShowWorkSessions] = useState(false);
  const [workSessions, setWorkSessions] = useState([]);
  const [showAdjustmentsModal, setShowAdjustmentsModal] = useState(false);
  const [showAddAdjustment, setShowAddAdjustment] = useState(false);
  const [selectedEmployeeForAdjustments, setSelectedEmployeeForAdjustments] = useState(null);
  const [employeeAdjustments, setEmployeeAdjustments] = useState([]);
  const [newAdjustment, setNewAdjustment] = useState({
    adjustment_type: "bonus",
    amount: "",
    reason: "",
    date: new Date().toISOString().split('T')[0]
  });
  const [editingAdjustment, setEditingAdjustment] = useState(null);
  const [showSalaryAdjustment, setShowSalaryAdjustment] = useState(false);
  const [selectedTechForSalary, setSelectedTechForSalary] = useState(null);
  const [salaryData, setSalaryData] = useState({ amount: "", reason: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [newTechnician, setNewTechnician] = useState({
    name: "",
    username: "",
    password: "",
    telegram_chat_id: "",
    permissions: []
  });

  const TASK_PERMISSIONS = [
    { id: 'create_task', name: 'إنشاء مهمة' },
    { id: 'edit_task', name: 'تعديل مهمة' },
    { id: 'delete_task', name: 'حذف مهمة' },
    { id: 'view_tasks', name: 'عرض المهام' },
    { id: 'assign_tasks', name: 'تعيين المهام' }
  ];
  const [showSettings, setShowSettings] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [pendingTaskData, setPendingTaskData] = useState(null);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [selectedTechnicians, setSelectedTechnicians] = useState([]);
  const [showRatingsModal, setShowRatingsModal] = useState(false);
  const [selectedTechForRating, setSelectedTechForRating] = useState(null);
  const [techRatings, setTechRatings] = useState(null);
  const [ratingTask, setRatingTask] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedTaskForReport, setSelectedTaskForReport] = useState(null);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  
  // ============== SALARY SYSTEM STATES ==============
  const [showSalaryPanel, setShowSalaryPanel] = useState(false);
  const [salarySummary, setSalarySummary] = useState([]);
  const [selectedEmpForSalary, setSelectedEmpForSalary] = useState(null);
  const [empSalaryInfo, setEmpSalaryInfo] = useState(null);
  const [showSetSalaryModal, setShowSetSalaryModal] = useState(false);
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);
  const [showPaySalaryModal, setShowPaySalaryModal] = useState(false);
  const [newSalarySetup, setNewSalarySetup] = useState({ base_salary: "", salary_day: 1 });
  const [newLoan, setNewLoan] = useState({ amount: "", reason: "" });
  const [paymentNotes, setPaymentNotes] = useState("");
  const [showSalaryHistory, setShowSalaryHistory] = useState(false);
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [showSetScheduleModal, setShowSetScheduleModal] = useState(false);
  const [selectedEmpForSchedule, setSelectedEmpForSchedule] = useState(null);
  const [scheduleData, setScheduleData] = useState({ daily_hours: 8, start_time: "09:00", end_time: "17:00" });
  
  const [newTask, setNewTask] = useState({
    customer_name: "",
    customer_phone: "",
    customer_address: "",
    issue_description: "",
    assigned_to: ""
  });

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });

  // Handle API errors including token expiration
  const handleApiError = (error) => {
    if (error.response?.status === 401 || error.response?.data?.detail === "Token expired") {
      toast.error("انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      return true;
    }
    return false;
  };

  useEffect(() => {
    fetchData();
    // Check for new notifications every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      const [tasksRes, techsRes, statsRes, notifRes, unreadRes] = await Promise.all([
        axios.get(`${API}/tasks`, getAuthHeaders()),
        axios.get(`${API}/technicians`, getAuthHeaders()),
        axios.get(`${API}/stats`, getAuthHeaders()),
        axios.get(`${API}/notifications`, getAuthHeaders()),
        axios.get(`${API}/notifications/unread/count`, getAuthHeaders())
      ]);
      setTasks(tasksRes.data);
      setTechnicians(techsRes.data);
      setStats(statsRes.data);
      
      // Check for new notifications and play sound
      if (notifRes.data.length > notifications.length && notifications.length > 0) {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBj+R1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKnl87dnHQU2jdXuzHosBil+zO/glEILFliy5uyrWBUIQ5zd8sFuJAUuhM/z2YgyBhxpvfLnm04MDU+m5fO0Zh0FN4/W7s15LAYpf83w4ZVDCxVXseXrqlYVCEOc3PLBbiQFLoTP89qJMgYZabvw6JxPDA5Pp+X0t2YdBzqO1O7LfC0GL4HN7+CVQgsVWLLm7KxXFQhDnN3ywW4kBS+Dz/PaiTIGGWm78OicUAwPUKjk8rdnHAc5j9TuynstBi+Aze/glUMLFViy5uysVxUJQpvd8sFuJAUug8/z2okyBhlpu/DonFAMD1Co5PK3ZxwHOY/U7sp7LQYvgc3w4ZRCCxVYsubsrFgVCUKb3fLCbiQFL4PP89qIMgYaabzw6JxPDA5Pp+TxtmcdBzmP1O7Ley0GL4DN8OGUQgsVWLLm7KxYFQlCm93ywm4kBS+Dz/PaiDIGGmm88OicUAwPUKfk8rZnHQc4jtXuy3stBi+AzfDhlEILFViy5uysWBUJQpvd8sJuJAUvg8/z2ogyBhppvPDonFAMD1Cn5PK2Zx0HOI7V7st7LQYvgM3w4ZRCCxVYsubsrFgVCUKb3fPCbiQFL4PP89qIMgYaabzw6JxPDA9Qp+TytmcdBziO1e7Ley0GL4DN8OGUQgsVWLLm7KxYFQlCm93zwm4kBS+Dz/PaiDIGGmm88OicTwwPUKfk8rZnHQc4jtXuy3stBi+AzfDhlEILFViy5uysWBUJQpvd88JuJAUvg8/z2ogyBhppvPDonE8MD1Cn5PK2Zx0HOI7V7st7LQYvgM3w4ZRCCxVYsubsrFgVCUKb3fPCbiQFL4PP89qIMgYaabzw6JxPDA9Qp+TytmcdBziO1e7Ley0GL4DN8OGUQQsVWLLm7KxYFQlCm93zwm4kBS+Dz/PaiDIGGmm88OicTwwPUKfk8rZnHQc4jtXuy3stBi+AzfDhlEILFViy5uysWBUJQpvd88NuJAUug9Dz2okyBhppvPDonE8MD1Cn5PK2ZxwHOI7V7st7LQYvgM3w4ZRCCxVYsubsrFgVCUKb3fPDbiQFLoPQ89qJMgYaabzw6JxPDA9Qp+TytmccBziO1e7Ley0GL4DN8OGUQgsVWLLm7KxYFQlCm93zw24kBS6D0PPaiTIGGmm88OicUAwPUKfk8rZnHAc4jtXuy3stBi+AzfDhlEILFViy5uysWBUJQpvd88NuJAUug9Dz2okyBhppvPDonE8MD1Cn5PK2ZxwHOI7V7st7LQYvgM3w4ZRCCxVYsubsrFgVCUKb3fPDbiQFLoPQ89qJMgYaabzw6JxPDA9Qp+TytmccBziO1e7Ley0GL4DN8OGUQgsVWLLm7KxYFQlCm93zw24kBS6D0PPaiTIGGmm88OicTwwPUKfk8rZnHAc4jtXuy3stBi+AzfDhlEILFViy5uysWBUJQpvd88NuJAUug9Dz2okyBhppvPDonE8MD1Cn5PK2ZxwHOI7V7st7LQYvgM3w4ZRCCxVYsubsrFgVCUKb3fPDbiQFLoPQ89qJMgYaabzw6JxQDA9Qp+TytmccBziO1e7Ley0GL4DN8OGUQgsVWLLm7KxYFQlCm93zw24kBS6D0PPaiTIGGmm88OicTwwPUKfk8rZnHAc4jtXuy3stBi+AzfDhlEILFViy5uysWBUJQpvd88NuJAUug9Dz2ogyBhppvPDonE8MD1Cn5PK2ZxwHOI7V7st7LQYvgM3w4ZRCCxVYsubsrFgVCUKb3fPDbiQFLoPQ89qJMgYaabzw6JxQDA9Qp+TytmccBziO1e7Ley0GL4DN8OGUQgsVWLLm7KxYFQlCm93zw24kBS6D0PPaiTIGGmm88OicTwwPUKfk8rZnHAc4jtXuy3stBi+AzfDhlEILFViy5uysWBUJQpvd88NuJAUug9Dz2ogyBhppvPDonE8MD1Cn5PK2ZxwHOI7V7st7LQYvgM3w4ZRCCxVYsubsrFgVCUKb3fPDbiQFLoPQ89qJMgYaabzw6JxQDA9Qp+TytmccBziO1e7Ley0GL4DN8OGUQgsVWLLm7KxYFQlCm93zw24kBS6D0PPaiTIGGmm88OicTwwPUKfk8rZnHAc4jtXuy3stBi+AzfDhlEILFViy5uysWBUJQpvd88NuJAUug9Dz2okyBhppvPDonE8MD1Cn5PK2ZxwHOI7V7st7LQYvgM3w4ZRCCxVYsubsrFgVCUKb3fPDbiQFLoPQ89qJMgYaabzw6JxQDA9Qp+TytmccBziO1e7Ley0GL4DN8OGUQgsVWLLm7KxYFQlCm93zw24kBS6D0PPaiTIGGmm88OicTwwPUKfk8rZnHAc4jtXuy3stBi+AzfDhlEILFViy5uysWBUJQpvd88NuJAUug9Dz2okyBhppvPDonE8MD1Cn5PK2ZxwHOI7V7st7LQYvgM3w4ZRCCxVYsubsrFgVCUKb3fPDbiQFLoPQ89qJMgYaabzw6JxQDA9Qp+TytmccBziO1e7Ley0GL4DN8OGUQgsVWLLm7KxYFQlCm93zw24kBS6D0PPaiTIGGmm88OicTwwPUKfk8rZnHAc4jtXuy3stBi+AzQ==');
        audio.play().catch(() => {});
      }
      
      setNotifications(notifRes.data);
      setUnreadCount(unreadRes.data.count);
    } catch (error) {
      console.error("Error fetching data:", error);
      handleApiError(error);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    // التحقق من اختيار موظف
    if (!newTask.assigned_to) {
      toast.error("⚠️ يرجى اختيار موظف لتعيين المهمة له");
      return;
    }
    
    try {
      // إنشاء المهمة
      await axios.post(`${API}/tasks`, newTask, getAuthHeaders());
      const assignedTech = technicians.find(t => t.id === newTask.assigned_to);
      
      // Success message
      toast.success(
        `✓ تم إنشاء المهمة بنجاح`,
        {
          description: `تم تعيين المهمة إلى ${assignedTech?.name || 'الموظف'}`,
          duration: 5000
        }
      );
      
      setShowCreateTask(false);
      
      // إرسال رسالة واتساب
      if (assignedTech?.whatsapp_number) {
        // الموظف عنده رقم واتساب - إرسال مباشر
        sendWhatsAppMessage(assignedTech.whatsapp_number, assignedTech.name);
      } else {
        // الموظف ما عنده رقم - طلب الرقم
        setPendingTaskData({
          technicianId: assignedTech.id,
          technicianName: assignedTech.name,
          customerName: newTask.customer_name,
          address: newTask.customer_address
        });
        setShowWhatsAppModal(true);
      }
      
      // إعادة تعيين النموذج
      setNewTask({
        customer_name: "",
        customer_phone: "",
        customer_address: "",
        issue_description: "",
        assigned_to: ""
      });
      
      fetchData();
    } catch (error) {
      toast.error("فشل إنشاء المهمة");
    }
  };
  
  const sendWhatsAppMessage = (phoneNumber, techName) => {
    // تنظيف رقم الهاتف
    let cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
    
    // إضافة 964 إذا بدأ بـ 07
    if (cleanNumber.startsWith('07')) {
      cleanNumber = '964' + cleanNumber.substring(1);
    }
    
    // الرسالة الجاهزة
    const message = `🔔 *لديك مهمة جديدة!*

👤 *المشترك:* ${pendingTaskData?.customerName || newTask.customer_name}
📍 *العنوان:* ${pendingTaskData?.address || newTask.customer_address}
⏰ *الوقت:* ${new Date().toLocaleString('ar-IQ')}

يرجى فتح التطبيق لعرض تفاصيل المهمة والبدء بالعمل.

_نظام إدارة الصيانة_`;

    // فتح واتساب
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    toast.success("تم فتح واتساب - أرسل الرسالة الآن 📱");
  };
  
  const handleSaveWhatsAppNumber = async () => {
    if (!whatsappNumber) {
      toast.error("يرجى إدخال رقم الواتساب");
      return;
    }
    
    try {
      // تحديث رقم الموظف في قاعدة البيانات
      await axios.patch(
        `${API}/technicians/${pendingTaskData.technicianId}/whatsapp`,
        { whatsapp_number: whatsappNumber },
        getAuthHeaders()
      );
      
      toast.success("تم حفظ الرقم بنجاح");
      
      // إرسال الرسالة
      sendWhatsAppMessage(whatsappNumber, pendingTaskData.technicianName);
      
      // إغلاق Modal
      setShowWhatsAppModal(false);
      setWhatsappNumber("");
      setPendingTaskData(null);
      
      // تحديث البيانات
      fetchData();
    } catch (error) {
      toast.error("فشل حفظ الرقم");
    }
  };

  const viewTaskLocation = async (task) => {
    try {
      const response = await axios.get(`${API}/locations/${task.id}`, getAuthHeaders());
      setLocations(response.data);
      setSelectedTask(task);
      
      // Aggressive auto-refresh location every 2 seconds when modal is open
      const locationInterval = setInterval(async () => {
        try {
          const updatedResponse = await axios.get(`${API}/locations/${task.id}`, getAuthHeaders());
          setLocations(updatedResponse.data);
        } catch (error) {
          console.error("Error updating location:", error);
        }
      }, 2000); // Update every 2 seconds for real-time tracking
      
      // Store interval ID to clear it when modal closes
      setSelectedTask({ ...task, locationInterval });
    } catch (error) {
      toast.error("فشل جلب الموقع");
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      await axios.patch(`${API}/notifications/${notificationId}/read`, {}, getAuthHeaders());
      fetchData();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await axios.delete(`${API}/tasks/${taskId}`, getAuthHeaders());
      toast.success("✓ تم حذف المهمة بنجاح");
      fetchData();
    } catch (error) {
      console.error("Delete task error:", error);
      if (!handleApiError(error)) {
        toast.error(error.response?.data?.detail || "فشل حذف المهمة");
      }
    }
  };

  // ============== VIEW REPORT FUNCTION ==============
  const handleViewReport = (task) => {
    setSelectedTaskForReport(task);
    setShowReportModal(true);
  };

  // ============== EDIT TASK FUNCTION ==============
  const handleEditTask = (task) => {
    setEditingTask({
      ...task,
      assigned_to: task.assigned_to || ""
    });
    setShowEditTaskModal(true);
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/tasks/${editingTask.id}`, {
        customer_name: editingTask.customer_name,
        customer_phone: editingTask.customer_phone,
        customer_address: editingTask.customer_address,
        issue_description: editingTask.issue_description,
        assigned_to: editingTask.assigned_to
      }, getAuthHeaders());
      toast.success("تم تحديث المهمة بنجاح");
      setShowEditTaskModal(false);
      setEditingTask(null);
      fetchData();
    } catch (error) {
      toast.error("فشل تحديث المهمة");
    }
  };

  // ============== ADJUSTMENTS FUNCTIONS (الخصومات والزيادات) ==============
  
  const fetchEmployeeAdjustments = async (employeeId) => {
    try {
      const response = await axios.get(`${API}/adjustments/employee/${employeeId}`, getAuthHeaders());
      setEmployeeAdjustments(response.data);
    } catch (error) {
      toast.error("فشل جلب الخصومات والزيادات");
    }
  };

  const handleAddAdjustment = async (e) => {
    e.preventDefault();
    
    if (!newAdjustment.amount || !newAdjustment.reason) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }
    
    try {
      await axios.post(`${API}/adjustments`, {
        employee_id: selectedEmployeeForAdjustments.id,
        adjustment_type: newAdjustment.adjustment_type,
        amount: parseFloat(newAdjustment.amount),
        reason: newAdjustment.reason,
        date: newAdjustment.date
      }, getAuthHeaders());
      
      toast.success("تم إضافة التعديل بنجاح");
      setShowAddAdjustment(false);
      setNewAdjustment({
        adjustment_type: "bonus",
        amount: "",
        reason: "",
        date: new Date().toISOString().split('T')[0]
      });
      fetchEmployeeAdjustments(selectedEmployeeForAdjustments.id);
    } catch (error) {
      toast.error("فشل إضافة التعديل");
    }
  };

  const handleUpdateAdjustment = async (adjustmentId) => {
    try {
      await axios.put(`${API}/adjustments/${adjustmentId}`, {
        amount: parseFloat(editingAdjustment.amount),
        reason: editingAdjustment.reason
      }, getAuthHeaders());
      
      toast.success("تم تحديث التعديل بنجاح");
      setEditingAdjustment(null);
      fetchEmployeeAdjustments(selectedEmployeeForAdjustments.id);
    } catch (error) {
      toast.error("فشل تحديث التعديل");
    }
  };

  const handleDeleteAdjustment = async (adjustmentId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التعديل؟")) return;
    
    try {
      await axios.delete(`${API}/adjustments/${adjustmentId}`, getAuthHeaders());
      toast.success("تم حذف التعديل بنجاح");
      fetchEmployeeAdjustments(selectedEmployeeForAdjustments.id);
    } catch (error) {
      toast.error("فشل حذف التعديل");
    }
  };


  const handleAddTechnician = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/users`, {
        username: newTechnician.username,
        name: newTechnician.name,
        password: newTechnician.password,
        role: 'employee',
        system: 'tasks',
        permissions: newTechnician.permissions,
        telegram_chat_id: newTechnician.telegram_chat_id
      }, getAuthHeaders());
      toast.success("✓ تم إضافة الموظف بنجاح");
      setShowAddTechnician(false);
      setNewTechnician({ name: "", username: "", password: "", telegram_chat_id: "", permissions: [] });
      fetchData();
    } catch (error) {
      if (!handleApiError(error)) {
        toast.error(error.response?.data?.detail || "فشل إضافة الموظف");
      }
    }
  };

  const handleDeleteTechnician = async (techId) => {
    try {
      await axios.delete(`${API}/users/${techId}`, getAuthHeaders());
      toast.success("✓ تم حذف الموظف بنجاح");
      fetchData();
    } catch (error) {
      if (!handleApiError(error)) {
        toast.error(error.response?.data?.detail || "فشل حذف الموظف");
      }
    }
  };

  const handleChangeEmployeePassword = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API}/users/${selectedTechForPassword.id}/change-password?new_password=${newPasswordData.password}`,
        {},
        getAuthHeaders()
      );
      toast.success("✓ تم تغيير كلمة المرور بنجاح");
      setShowChangePassword(false);
      setSelectedTechForPassword(null);
      setNewPasswordData({ password: "" });
    } catch (error) {
      toast.error("فشل تغيير كلمة المرور");
    }
  };

  // ============== PERMISSIONS FUNCTIONS ==============
  const handleUpdatePermissions = async (techId, permissions) => {
    try {
      await axios.put(`${API}/users/${techId}`, {
        permissions: permissions
      }, getAuthHeaders());
      toast.success("✓ تم تحديث الصلاحيات بنجاح");
      fetchData();
    } catch (error) {
      if (!handleApiError(error)) {
        toast.error("فشل تحديث الصلاحيات");
      }
    }
  };

  const togglePermission = (permId) => {
    if (!selectedTechForPermissions) return;
    
    const currentPermissions = selectedTechForPermissions.permissions || [];
    let newPermissions;
    
    if (currentPermissions.includes(permId)) {
      newPermissions = currentPermissions.filter(p => p !== permId);
    } else {
      newPermissions = [...currentPermissions, permId];
    }
    
    setSelectedTechForPermissions({
      ...selectedTechForPermissions,
      permissions: newPermissions
    });
  };

  const savePermissions = async () => {
    await handleUpdatePermissions(selectedTechForPermissions.id, selectedTechForPermissions.permissions || []);
    setShowEditPermissions(false);
    setSelectedTechForPermissions(null);
  };

  const fetchWorkSessions = async () => {
    try {
      const sessions = await Promise.all(
        technicians.map(async (tech) => {
          const response = await axios.get(`${API}/work-sessions/employee/${tech.id}`, getAuthHeaders());
          return { employee: tech, sessions: response.data };
        })
      );
      setWorkSessions(sessions);
    } catch (error) {
      console.error("Error fetching work sessions:", error);
    }
  };

  const handleSalaryAdjustment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API}/salary-adjustment?employee_id=${selectedTechForSalary.id}&amount=${salaryData.amount}&reason=${encodeURIComponent(salaryData.reason)}`,
        {},
        getAuthHeaders()
      );
      toast.success("✓ تم تسجيل التعديل على الراتب بنجاح");
      setShowSalaryAdjustment(false);
      setSelectedTechForSalary(null);
      setSalaryData({ amount: "", reason: "" });
    } catch (error) {
      toast.error("فشل تسجيل التعديل");
    }
  };

  const setEmployeeSchedule = async (employeeId, dailyHours, startTime, endTime) => {
    try {
      await axios.post(
        `${API}/employee-schedule`,
        {
          employee_id: employeeId,
          daily_hours: dailyHours,
          start_time: startTime,
          end_time: endTime
        },
        getAuthHeaders()
      );
      toast.success("✓ تم تحديد وقت العمل بنجاح");
    } catch (error) {
      toast.error("فشل تحديد وقت العمل");
    }
  };
  
  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast.error("يرجى كتابة الرسالة");
      return;
    }
    
    if (selectedTechnicians.length === 0) {
      toast.error("يرجى اختيار موظف واحد على الأقل");
      return;
    }
    
    try {
      const response = await axios.post(
        `${API}/broadcast-message`,
        {
          message: broadcastMessage,
          technician_ids: selectedTechnicians
        },
        getAuthHeaders()
      );
      
      toast.success(`✓ تم إرسال الرسالة إلى ${response.data.sent} موظف`);
      setShowBroadcastModal(false);
      setBroadcastMessage("");
      setSelectedTechnicians([]);
    } catch (error) {
      toast.error("فشل إرسال الرسالة");
    }
  };
  
  const viewTechnicianRatings = async (tech) => {
    try {
      const response = await axios.get(`${API}/technicians/${tech.id}/ratings`, getAuthHeaders());
      setTechRatings(response.data);
      setSelectedTechForRating(tech);
      setShowRatingsModal(true);
    } catch (error) {
      toast.error("فشل جلب التقييمات");
    }
  };
  
  const handleAddRating = async () => {
    if (!ratingValue) {
      toast.error("يرجى اختيار التقييم");
      return;
    }
    
    try {
      await axios.post(
        `${API}/tasks/${ratingTask}/rate`,
        {
          rating: ratingValue,
          comment: ratingComment
        },
        getAuthHeaders()
      );
      
      toast.success("✓ تم إضافة التقييم");
      setRatingTask(null);
      setRatingValue(5);
      setRatingComment("");
      fetchData();
      
      // Refresh ratings if modal is open
      if (selectedTechForRating) {
        viewTechnicianRatings(selectedTechForRating);
      }
    } catch (error) {
      toast.error("فشل إضافة التقييم");
    }
  };

  const showTasksByStatus = (status, title) => {
    let filteredTasks = [];
    if (status === "all") {
      filteredTasks = tasks;
    } else {
      filteredTasks = tasks.filter(task => task.status === status);
    }
    setModalTasks(filteredTasks);
    setModalTasksType(title);
    setShowTasksModal(true);
  };

  const getStatusText = (status) => {
    const statusMap = {
      pending: "قيد الانتظار",
      accepted: "تم القبول",
      in_progress: "قيد التنفيذ",
      completed: "مكتملة"
    };
    return statusMap[status] || status;
  };

  // ============== SALARY SYSTEM FUNCTIONS ==============
  
  const fetchSalarySummary = async () => {
    try {
      const response = await axios.get(`${API}/employees/salary-summary`, getAuthHeaders());
      setSalarySummary(response.data);
    } catch (error) {
      console.error("Error fetching salary summary:", error);
    }
  };

  const fetchEmployeeSalaryInfo = async (employeeId) => {
    try {
      const response = await axios.get(`${API}/employees/${employeeId}/salary-info`, getAuthHeaders());
      setEmpSalaryInfo(response.data);
    } catch (error) {
      toast.error("فشل جلب معلومات الراتب");
    }
  };

  const handleSetSalary = async (e) => {
    e.preventDefault();
    if (!newSalarySetup.base_salary) {
      toast.error("يرجى إدخال الراتب الأساسي");
      return;
    }
    
    try {
      await axios.post(`${API}/employees/${selectedEmpForSalary.id}/salary-setup`, {
        employee_id: selectedEmpForSalary.id,
        base_salary: parseFloat(newSalarySetup.base_salary),
        salary_day: parseInt(newSalarySetup.salary_day)
      }, getAuthHeaders());
      
      toast.success("تم إعداد الراتب بنجاح");
      setShowSetSalaryModal(false);
      setNewSalarySetup({ base_salary: "", salary_day: 1 });
      fetchSalarySummary();
      if (selectedEmpForSalary) {
        fetchEmployeeSalaryInfo(selectedEmpForSalary.id);
      }
    } catch (error) {
      toast.error("فشل إعداد الراتب");
    }
  };

  const handleAddLoan = async (e) => {
    e.preventDefault();
    if (!newLoan.amount || !newLoan.reason) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }
    
    try {
      await axios.post(`${API}/loans`, {
        employee_id: selectedEmpForSalary.id,
        amount: parseFloat(newLoan.amount),
        reason: newLoan.reason
      }, getAuthHeaders());
      
      toast.success("تم إضافة السلفة بنجاح");
      setShowAddLoanModal(false);
      setNewLoan({ amount: "", reason: "" });
      fetchSalarySummary();
      fetchEmployeeSalaryInfo(selectedEmpForSalary.id);
    } catch (error) {
      toast.error("فشل إضافة السلفة");
    }
  };

  const handlePaySalary = async () => {
    try {
      const response = await axios.post(`${API}/salary-payments`, {
        employee_id: selectedEmpForSalary.id,
        notes: paymentNotes
      }, getAuthHeaders());
      
      toast.success(`تم تسليم الراتب: ${response.data.final_salary.toLocaleString()} دينار`);
      setShowPaySalaryModal(false);
      setPaymentNotes("");
      fetchSalarySummary();
      fetchEmployeeSalaryInfo(selectedEmpForSalary.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل تسليم الراتب");
    }
  };

  const handleDeleteLoan = async (loanId) => {
    try {
      await axios.delete(`${API}/loans/${loanId}`, getAuthHeaders());
      toast.success("✓ تم حذف السلفة بنجاح");
      fetchEmployeeSalaryInfo(selectedEmpForSalary.id);
      fetchSalarySummary();
    } catch (error) {
      console.error("Delete loan error:", error);
      if (!handleApiError(error)) {
        toast.error(error.response?.data?.detail || "فشل حذف السلفة");
      }
    }
  };

  // Fetch salary history
  const fetchSalaryHistory = async () => {
    try {
      const response = await axios.get(`${API}/salary-payments/all`, getAuthHeaders());
      setSalaryHistory(response.data);
    } catch (error) {
      console.error("Error fetching salary history:", error);
    }
  };

  // Set employee schedule with modal
  const handleSetSchedule = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/users/${selectedEmpForSchedule.id}/schedule`, {
        daily_hours: parseFloat(scheduleData.daily_hours),
        start_time: scheduleData.start_time,
        end_time: scheduleData.end_time
      }, getAuthHeaders());
      toast.success("✓ تم تحديد وقت العمل بنجاح");
      setShowSetScheduleModal(false);
      fetchWorkSessions();
    } catch (error) {
      if (!handleApiError(error)) {
        toast.error("فشل تحديد وقت العمل");
      }
    }
  };

  return (
    <div className="min-h-screen p-6" data-testid="admin-dashboard">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#667eea' }}>لوحة تحكم المدير</h1>
            <p className="text-gray-600">مرحباً، {user.name}</p>
          </div>
          <div className="flex gap-3">
            {/* Settings Button */}
            <button 
              onClick={() => setShowSettings(true)} 
              className="secondary-button"
              data-testid="settings-button"
            >
              <SettingsIcon className="inline ml-2" size={20} />
              الإعدادات
            </button>
            
            {/* Notifications Button */}
            <button 
              onClick={() => setShowNotifications(!showNotifications)} 
              className="secondary-button relative"
              data-testid="notifications-button"
            >
              <Bell className="inline ml-2" size={20} />
              الإشعارات
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <button onClick={onLogout} className="secondary-button" data-testid="logout-button">
              <LogOut className="inline ml-2" size={20} />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="max-w-7xl mx-auto mb-6" data-testid="notifications-panel">
          <div className="card" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">الإشعارات</h3>
              <button onClick={() => setShowNotifications(false)}>
                <X size={20} />
              </button>
            </div>
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-center py-4">لا توجد إشعارات</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`p-3 rounded-lg cursor-pointer ${
                      notif.read ? 'bg-gray-100' : 'bg-blue-50'
                    }`}
                    onClick={() => markNotificationRead(notif.id)}
                    data-testid={`notification-${notif.id}`}
                  >
                    <p className="font-medium">{notif.message}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(notif.created_at).toLocaleString('ar-IQ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div 
            className="stat-card cursor-pointer hover:scale-105 transition-transform"
            onClick={() => showTasksByStatus("all", "إجمالي المهام")}
            data-testid="stat-total-tasks"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">إجمالي المهام</p>
                <p className="text-3xl font-bold">{stats.total_tasks}</p>
              </div>
              <Clock size={40} className="opacity-80" />
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:scale-105 transition-transform" 
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}
            onClick={() => showTasksByStatus("pending", "المهام قيد الانتظار")}
            data-testid="stat-pending-tasks"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">قيد الانتظار</p>
                <p className="text-3xl font-bold">{stats.pending}</p>
              </div>
              <AlertCircle size={40} className="opacity-80" />
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:scale-105 transition-transform" 
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white' }}
            onClick={() => showTasksByStatus("in_progress", "المهام قيد التنفيذ")}
            data-testid="stat-in-progress-tasks"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">قيد التنفيذ</p>
                <p className="text-3xl font-bold">{stats.in_progress}</p>
              </div>
              <MapPin size={40} className="opacity-80" />
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:scale-105 transition-transform" 
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}
            onClick={() => showTasksByStatus("completed", "المهام المكتملة")}
            data-testid="stat-completed-tasks"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">مكتملة</p>
                <p className="text-3xl font-bold">{stats.completed}</p>
              </div>
              <CheckCircle size={40} className="opacity-80" />
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:scale-105 transition-transform animate-pulse" 
            style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white' }}
            onClick={() => {
              const incomplete = tasks.filter(t => t.status !== 'completed');
              setModalTasks(incomplete);
              setModalTasksType("المهام غير المكتملة ⚠️");
              setShowTasksModal(true);
            }}
            data-testid="stat-incomplete-tasks"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">غير مكتملة ⚠️</p>
                <p className="text-3xl font-bold">{tasks.filter(t => t.status !== 'completed').length}</p>
              </div>
              <AlertCircle size={40} className="opacity-80" />
            </div>
          </div>
        </div>
      )}

      {/* Create Task Button */}
      <div className="max-w-7xl mx-auto mb-6 flex gap-4">
        <button
          onClick={() => setShowCreateTask(true)}
          className="primary-button"
          data-testid="create-task-button"
        >
          <Plus className="inline ml-2" size={20} />
          إنشاء مهمة جديدة
        </button>
        
        <button
          onClick={() => setShowAddTechnician(true)}
          className="success-button"
          data-testid="add-technician-button"
        >
          <UserPlus className="inline ml-2" size={20} />
          إضافة موظف جديد
        </button>
        
        <button
          onClick={() => setShowTechniciansModal(true)}
          className="secondary-button"
          data-testid="view-technicians-button"
        >
          <Users className="inline ml-2" size={20} />
          إدارة الموظفين ({technicians.length})
        </button>
        
        <button
          onClick={() => {
            fetchWorkSessions();
            setShowWorkSessions(true);
          }}
          className="card px-4 py-2 flex items-center gap-2 hover:shadow-lg transition-all"
          style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}
          data-testid="work-sessions-button"
        >
          <Clock className="inline" size={20} />
          ⏰ أوقات الموظفين
        </button>
        
        <button
          onClick={() => setShowBroadcastModal(true)}
          className="card px-4 py-2 flex items-center gap-2 hover:shadow-lg transition-all"
          style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}
          data-testid="broadcast-button"
        >
          <Send className="inline" size={20} />
          إرسال رسالة
        </button>
        
        <button
          onClick={() => {
            setShowSalaryPanel(!showSalaryPanel);
            if (!showSalaryPanel) fetchSalarySummary();
          }}
          className="card px-4 py-2 flex items-center gap-2 hover:shadow-lg transition-all"
          style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: 'white' }}
          data-testid="salary-panel-button"
        >
          <Wallet className="inline" size={20} />
          💰 نظام الرواتب
        </button>
      </div>

      {/* ============== SALARY MANAGEMENT PANEL ============== */}
      {showSalaryPanel && (
        <div className="max-w-7xl mx-auto mb-6" data-testid="salary-panel">
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#667eea' }}>
                <Wallet className="inline ml-2" size={28} />
                💰 نظام إدارة الرواتب والسلف
              </h2>
              <button onClick={() => setShowSalaryPanel(false)}>
                <X size={24} />
              </button>
            </div>

            {/* Current Month */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl p-4 mb-6 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Calendar size={24} />
                <span className="text-xl font-bold">
                  شهر {new Date().toLocaleDateString('ar-IQ', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <button
                onClick={() => {
                  fetchSalaryHistory();
                  setShowSalaryHistory(true);
                }}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
              >
                <FileText size={18} />
                📜 سجل الرواتب
              </button>
            </div>

            {/* Employees Salary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {technicians.map((tech) => {
                const salaryInfo = salarySummary.find(s => s.employee_id === tech.id) || {};
                return (
                  <div 
                    key={tech.id} 
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                      selectedEmpForSalary?.id === tech.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                    }`}
                    onClick={() => {
                      setSelectedEmpForSalary(tech);
                      fetchEmployeeSalaryInfo(tech.id);
                    }}
                    data-testid={`salary-card-${tech.id}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{tech.name}</h3>
                        <p className="text-sm text-gray-500">@{tech.username}</p>
                      </div>
                      {salaryInfo.is_paid ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">
                          ✅ تم التسليم
                        </span>
                      ) : (
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold">
                          ⏳ لم يُسلّم
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">الراتب الأساسي:</span>
                        <span className="font-bold">{(salaryInfo.base_salary || 0).toLocaleString()} د.ع</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>السلف:</span>
                        <span className="font-bold">-{(salaryInfo.total_loans || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>الخصومات:</span>
                        <span className="font-bold">-{(salaryInfo.total_deductions || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>الزيادات:</span>
                        <span className="font-bold">+{(salaryInfo.total_bonuses || 0).toLocaleString()}</span>
                      </div>
                      <hr className="my-2" />
                      <div className="flex justify-between text-lg">
                        <span className="font-bold">الراتب النهائي:</span>
                        <span className="font-bold text-purple-600">{(salaryInfo.final_salary || 0).toLocaleString()} د.ع</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Employee Details */}
            {selectedEmpForSalary && empSalaryInfo && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl" data-testid="employee-salary-details">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Users size={24} />
                  تفاصيل راتب: {selectedEmpForSalary.name}
                </h3>
                
                {/* Action Buttons */}
                <div className="flex gap-3 mb-4 flex-wrap">
                  <button
                    onClick={() => {
                      setNewSalarySetup({
                        base_salary: empSalaryInfo.base_salary || "",
                        salary_day: empSalaryInfo.salary_day || 1
                      });
                      setShowSetSalaryModal(true);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                    data-testid="set-salary-btn"
                  >
                    <DollarSign size={18} />
                    تعديل الراتب
                  </button>
                  
                  <button
                    onClick={() => setShowAddLoanModal(true)}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
                    data-testid="add-loan-btn"
                  >
                    <CreditCard size={18} />
                    إضافة سلفة
                  </button>
                  
                  <button
                    onClick={() => setShowPaySalaryModal(true)}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                    disabled={salarySummary.find(s => s.employee_id === selectedEmpForSalary.id)?.is_paid}
                    data-testid="pay-salary-btn"
                  >
                    <Wallet size={18} />
                    تسليم الراتب
                  </button>
                </div>

                {/* Unpaid Loans */}
                {empSalaryInfo.unpaid_loans?.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-bold mb-2 text-red-600">💸 السلف غير المدفوعة:</h4>
                    <div className="space-y-2">
                      {empSalaryInfo.unpaid_loans.map((loan) => (
                        <div key={loan.id} className="flex justify-between items-center bg-red-50 p-3 rounded-lg">
                          <div>
                            <span className="font-bold">{loan.amount.toLocaleString()} د.ع</span>
                            <span className="text-sm text-gray-500 mr-2">- {loan.reason}</span>
                            <span className="text-xs text-gray-400 mr-2">({loan.loan_date})</span>
                          </div>
                          <button
                            onClick={() => handleDeleteLoan(loan.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1 transition-all"
                            data-testid={`delete-loan-${loan.id}`}
                          >
                            <Trash2 size={14} />
                            حذف
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Month Adjustments */}
                {empSalaryInfo.current_month_adjustments?.length > 0 && (
                  <div>
                    <h4 className="font-bold mb-2 text-blue-600">📋 تعديلات الشهر الحالي:</h4>
                    <div className="space-y-2">
                      {empSalaryInfo.current_month_adjustments.map((adj, idx) => (
                        <div 
                          key={idx} 
                          className={`flex justify-between items-center p-3 rounded-lg ${
                            adj.adjustment_type === 'bonus' ? 'bg-green-50' : 'bg-red-50'
                          }`}
                        >
                          <div>
                            <span className={`font-bold ${adj.adjustment_type === 'bonus' ? 'text-green-600' : 'text-red-600'}`}>
                              {adj.adjustment_type === 'bonus' ? '+' : '-'}{adj.amount.toLocaleString()} د.ع
                            </span>
                            <span className="text-sm text-gray-500 mr-2">- {adj.reason}</span>
                          </div>
                          <span className="text-xs text-gray-400">{adj.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Set Salary Modal */}
      {showSetSalaryModal && selectedEmpForSalary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="set-salary-modal">
          <div className="card max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#667eea' }}>
                <DollarSign className="inline ml-2" size={24} />
                إعداد راتب: {selectedEmpForSalary.name}
              </h2>
              <button onClick={() => setShowSetSalaryModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSetSalary} className="space-y-4">
              <div>
                <label className="label">الراتب الأساسي (دينار)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="500000"
                  value={newSalarySetup.base_salary}
                  onChange={(e) => setNewSalarySetup({ ...newSalarySetup, base_salary: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="label">يوم استلام الراتب</label>
                <select
                  className="input-field"
                  value={newSalarySetup.salary_day}
                  onChange={(e) => setNewSalarySetup({ ...newSalarySetup, salary_day: e.target.value })}
                >
                  {[...Array(28)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3">
                <button type="submit" className="success-button flex-1">
                  ✓ حفظ
                </button>
                <button type="button" onClick={() => setShowSetSalaryModal(false)} className="secondary-button flex-1">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Loan Modal */}
      {showAddLoanModal && selectedEmpForSalary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="add-loan-modal">
          <div className="card max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#667eea' }}>
                <CreditCard className="inline ml-2" size={24} />
                إضافة سلفة: {selectedEmpForSalary.name}
              </h2>
              <button onClick={() => setShowAddLoanModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddLoan} className="space-y-4">
              <div>
                <label className="label">المبلغ (دينار)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="100000"
                  value={newLoan.amount}
                  onChange={(e) => setNewLoan({ ...newLoan, amount: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="label">السبب</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="سلفة شخصية..."
                  value={newLoan.reason}
                  onChange={(e) => setNewLoan({ ...newLoan, reason: e.target.value })}
                  required
                />
              </div>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                <p className="text-sm text-yellow-700">
                  ⚠️ سيتم خصم هذا المبلغ تلقائياً من راتب الموظف القادم
                </p>
              </div>
              
              <div className="flex gap-3">
                <button type="submit" className="primary-button flex-1">
                  ✓ إضافة السلفة
                </button>
                <button type="button" onClick={() => setShowAddLoanModal(false)} className="secondary-button flex-1">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Salary Modal */}
      {showPaySalaryModal && selectedEmpForSalary && empSalaryInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="pay-salary-modal">
          <div className="card max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold" style={{ color: '#667eea' }}>
                <Wallet className="inline ml-2" size={24} />
                تسليم راتب: {selectedEmpForSalary.name}
              </h2>
              <button onClick={() => setShowPaySalaryModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span>الراتب الأساسي:</span>
                <span className="font-bold">{(empSalaryInfo.base_salary || 0).toLocaleString()} د.ع</span>
              </div>
              <div className="flex justify-between p-3 bg-red-50 rounded-lg text-red-600">
                <span>السلف:</span>
                <span className="font-bold">-{(empSalaryInfo.total_loans || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 bg-red-50 rounded-lg text-red-600">
                <span>الخصومات:</span>
                <span className="font-bold">-{(empSalaryInfo.total_deductions || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 bg-green-50 rounded-lg text-green-600">
                <span>الزيادات:</span>
                <span className="font-bold">+{(empSalaryInfo.total_bonuses || 0).toLocaleString()}</span>
              </div>
              <hr />
              <div className="flex justify-between p-3 bg-purple-100 rounded-lg text-purple-700 text-lg">
                <span className="font-bold">الراتب النهائي:</span>
                <span className="font-bold">{(empSalaryInfo.final_salary || 0).toLocaleString()} د.ع</span>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="label">ملاحظات (اختياري)</label>
              <textarea
                className="input-field"
                rows="2"
                placeholder="أي ملاحظات إضافية..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
            
            <div className="flex gap-3">
              <button onClick={handlePaySalary} className="success-button flex-1">
                ✓ تأكيد التسليم
              </button>
              <button onClick={() => setShowPaySalaryModal(false)} className="secondary-button flex-1">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Salary History Modal */}
      {showSalaryHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="salary-history-modal">
          <div className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#667eea' }}>
                📜 سجل الرواتب المُسلّمة
              </h2>
              <button onClick={() => setShowSalaryHistory(false)}>
                <X size={24} />
              </button>
            </div>
            
            {salaryHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Wallet size={64} className="mx-auto mb-4 opacity-30" />
                <p className="text-xl">لا توجد رواتب مُسلّمة بعد</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
                    <tr>
                      <th className="p-3 text-right rounded-tr-lg">الموظف</th>
                      <th className="p-3 text-right">الشهر</th>
                      <th className="p-3 text-right">الراتب الأساسي</th>
                      <th className="p-3 text-right">السلف</th>
                      <th className="p-3 text-right">الخصومات</th>
                      <th className="p-3 text-right">الزيادات</th>
                      <th className="p-3 text-right">الصافي</th>
                      <th className="p-3 text-right rounded-tl-lg">تاريخ التسليم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryHistory.map((payment, idx) => (
                      <tr key={payment.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="p-3 font-bold">{payment.employee_name}</td>
                        <td className="p-3">{payment.payment_month}</td>
                        <td className="p-3">{payment.base_salary?.toLocaleString() || 0}</td>
                        <td className="p-3 text-red-600">-{payment.total_loans?.toLocaleString() || 0}</td>
                        <td className="p-3 text-red-600">-{payment.total_deductions?.toLocaleString() || 0}</td>
                        <td className="p-3 text-green-600">+{payment.total_bonuses?.toLocaleString() || 0}</td>
                        <td className="p-3 font-bold text-purple-600">{payment.final_salary?.toLocaleString() || 0}</td>
                        <td className="p-3 text-sm text-gray-500">
                          {new Date(payment.payment_date).toLocaleDateString('ar-IQ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Summary */}
                <div className="mt-6 p-4 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-xl">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600">إجمالي الرواتب المُسلّمة</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {salaryHistory.reduce((sum, p) => sum + (p.final_salary || 0), 0).toLocaleString()} د.ع
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">عدد الرواتب</p>
                      <p className="text-2xl font-bold text-indigo-600">{salaryHistory.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">إجمالي السلف المخصومة</p>
                      <p className="text-2xl font-bold text-red-600">
                        {salaryHistory.reduce((sum, p) => sum + (p.total_loans || 0), 0).toLocaleString()} د.ع
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <button
              onClick={() => setShowSalaryHistory(false)}
              className="w-full mt-4 secondary-button"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Add Technician Modal */}
      {showAddTechnician && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#667eea' }}>👤 إضافة موظف جديد</h2>
            <form onSubmit={handleAddTechnician} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">الاسم الكامل *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newTechnician.name}
                    onChange={(e) => setNewTechnician({ ...newTechnician, name: e.target.value })}
                    required
                    placeholder="أحمد محمد"
                  />
                </div>

                <div>
                  <label className="label">اسم المستخدم (Username) *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newTechnician.username}
                    onChange={(e) => setNewTechnician({ ...newTechnician, username: e.target.value })}
                    required
                    placeholder="ahmed123"
                  />
                </div>
              </div>

              <div>
                <label className="label">كلمة المرور *</label>
                <input
                  type="text"
                  className="input-field"
                  value={newTechnician.password}
                  onChange={(e) => setNewTechnician({ ...newTechnician, password: e.target.value })}
                  required
                  placeholder="اكتب كلمة مرور قوية"
                />
                <p className="text-xs text-gray-500 mt-1">⚠️ احفظ كلمة المرور وأرسلها للموظف</p>
              </div>

              <div>
                <label className="label">Telegram Chat ID (اختياري)</label>
                <input
                  type="text"
                  className="input-field"
                  value={newTechnician.telegram_chat_id || ""}
                  onChange={(e) => setNewTechnician({ ...newTechnician, telegram_chat_id: e.target.value })}
                  placeholder="مثال: 123456789"
                />
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                  <p className="text-xs text-blue-800 font-bold mb-2">📱 كيفية الحصول على Chat ID:</p>
                  <ol className="text-xs text-blue-700 space-y-1 mr-4">
                    <li>1. افتح Telegram وابحث عن: <strong>@userinfobot</strong></li>
                    <li>2. اضغط Start</li>
                    <li>3. سيرسل لك Chat ID الخاص بك</li>
                  </ol>
                </div>
              </div>

              {/* Permissions Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-gray-800">🔐 الصلاحيات</h3>
                  <button
                    type="button"
                    onClick={() => setNewTechnician({
                      ...newTechnician,
                      permissions: TASK_PERMISSIONS.map(p => p.id)
                    })}
                    className="text-sm bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
                  >
                    تحديد الكل
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {TASK_PERMISSIONS.map((perm) => (
                    <label key={perm.id} className="flex items-center gap-2 p-2 bg-white rounded border cursor-pointer hover:border-purple-400">
                      <input
                        type="checkbox"
                        checked={newTechnician.permissions.includes(perm.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewTechnician({
                              ...newTechnician,
                              permissions: [...newTechnician.permissions, perm.id]
                            });
                          } else {
                            setNewTechnician({
                              ...newTechnician,
                              permissions: newTechnician.permissions.filter(p => p !== perm.id)
                            });
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{perm.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">📋 بيانات الدخول:</p>
                <p className="text-xs text-blue-600 mt-1">اليوزر: {newTechnician.username || "..."}</p>
                <p className="text-xs text-blue-600">الباسورد: {newTechnician.password || "..."}</p>
              </div>

              <div className="flex gap-4">
                <button type="submit" className="success-button flex-1">
                  إضافة الموظف
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTechnician(false);
                    setNewTechnician({ name: "", username: "", password: "", telegram_chat_id: "", permissions: [] });
                  }}
                  className="secondary-button flex-1"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Technicians Management Modal */}
      {showTechniciansModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#667eea' }}>
                إدارة الموظفين ({technicians.length})
              </h2>
              <button onClick={() => setShowTechniciansModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            {technicians.length === 0 ? (
              <div className="text-center py-12">
                <Users size={64} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">لا يوجد موظفين</p>
                <button
                  onClick={() => {
                    setShowTechniciansModal(false);
                    setShowAddTechnician(true);
                  }}
                  className="primary-button mt-4"
                >
                  <UserPlus className="inline ml-2" size={18} />
                  إضافة أول موظف
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {technicians.map((tech) => (
                  <div key={tech.id} className="card bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                          {tech.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{tech.name}</h3>
                          <p className="text-sm text-gray-600">{tech.email}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-500">
                        <p>انضم: {new Date(tech.created_at).toLocaleDateString('ar-IQ')}</p>
                        {tech.permissions?.length > 0 && (
                          <p className="text-green-600 mt-1">✓ {tech.permissions.length} صلاحيات</p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            setSelectedTechForPermissions({...tech});
                            setShowEditPermissions(true);
                          }}
                          className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-all"
                        >
                          🔑 الصلاحيات
                        </button>
                        <button
                          onClick={async () => {
                            const sessions = await axios.get(`${API}/work-sessions/employee/${tech.id}`, getAuthHeaders());
                            setWorkSessions([{ employee: tech, sessions: sessions.data }]);
                            setShowWorkSessions(true);
                          }}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          📋 السجل
                        </button>
                        <button
                          onClick={async () => {
                            setSelectedEmployeeForAdjustments(tech);
                            await fetchEmployeeAdjustments(tech.id);
                            setShowAdjustmentsModal(true);
                          }}
                          className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                        >
                          💰 الخصومات والزيادات
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTechForPassword(tech);
                            setShowChangePassword(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          🔐 تغيير الرمز
                        </button>
                        <button
                          onClick={() => handleDeleteTechnician(tech.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1 transition-all"
                          data-testid={`delete-tech-${tech.id}`}
                        >
                          <Trash2 size={14} />
                          حذف الموظف
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {showEditPermissions && selectedTechForPermissions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="edit-permissions-modal">
          <div className="card max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold" style={{ color: '#667eea' }}>
                🔑 صلاحيات: {selectedTechForPermissions.name}
              </h2>
              <button onClick={() => { setShowEditPermissions(false); setSelectedTechForPermissions(null); }}>
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-3 mb-6">
              {TASK_PERMISSIONS.map((perm) => (
                <label 
                  key={perm.id} 
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                    (selectedTechForPermissions.permissions || []).includes(perm.id)
                      ? 'bg-green-100 border-2 border-green-500'
                      : 'bg-gray-50 border-2 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={(selectedTechForPermissions.permissions || []).includes(perm.id)}
                    onChange={() => togglePermission(perm.id)}
                    className="w-5 h-5 accent-green-500"
                  />
                  <span className="font-medium">{perm.name}</span>
                  {(selectedTechForPermissions.permissions || []).includes(perm.id) && (
                    <span className="mr-auto text-green-600">✓</span>
                  )}
                </label>
              ))}
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg mb-4 text-sm text-blue-700">
              <p>💡 الصلاحيات المحددة: <strong>{(selectedTechForPermissions.permissions || []).length}</strong> من {TASK_PERMISSIONS.length}</p>
            </div>
            
            <div className="flex gap-3">
              <button onClick={savePermissions} className="success-button flex-1">
                ✓ حفظ الصلاحيات
              </button>
              <button 
                onClick={() => { setShowEditPermissions(false); setSelectedTechForPermissions(null); }} 
                className="secondary-button flex-1"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="create-task-modal">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#667eea' }}>إنشاء مهمة جديدة</h2>
            
            {technicians.length === 0 ? (
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 mb-6">
                <div className="text-center">
                  <p className="text-yellow-800 font-bold text-lg mb-2">⚠️ لا يوجد موظفين متاحين</p>
                  <p className="text-yellow-700 text-sm mb-4">يجب إضافة موظف أولاً قبل إنشاء المهام</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateTask(false);
                      setShowAddTechnician(true);
                    }}
                    className="success-button"
                  >
                    <UserPlus className="inline ml-2" size={18} />
                    إضافة موظف جديد
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="label">اسم المشترك</label>
                <input
                  type="text"
                  className="input-field"
                  value={newTask.customer_name}
                  onChange={(e) => setNewTask({ ...newTask, customer_name: e.target.value })}
                  required
                  data-testid="customer-name-input"
                />
              </div>

              <div>
                <label className="label">رقم الهاتف</label>
                <input
                  type="text"
                  className="input-field"
                  value={newTask.customer_phone}
                  onChange={(e) => setNewTask({ ...newTask, customer_phone: e.target.value })}
                  required
                  data-testid="customer-phone-input"
                />
              </div>

              <div>
                <label className="label">العنوان</label>
                <input
                  type="text"
                  className="input-field"
                  value={newTask.customer_address}
                  onChange={(e) => setNewTask({ ...newTask, customer_address: e.target.value })}
                  required
                  data-testid="customer-address-input"
                />
              </div>

              <div>
                <label className="label">وصف العطل</label>
                <textarea
                  className="input-field"
                  rows="4"
                  value={newTask.issue_description}
                  onChange={(e) => setNewTask({ ...newTask, issue_description: e.target.value })}
                  required
                  data-testid="issue-description-input"
                />
              </div>

              <div>
                <label className="label">اختر الموظف لإرسال المهمة له *</label>
                
                {/* Visual selection of technicians */}
                <div className="grid grid-cols-1 gap-3 mb-3">
                  {technicians.map((tech) => (
                    <div
                      key={tech.id}
                      onClick={() => setNewTask({ ...newTask, assigned_to: tech.id })}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        newTask.assigned_to === tech.id
                          ? 'border-purple-500 bg-purple-50 shadow-lg'
                          : 'border-gray-200 bg-white hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                          newTask.assigned_to === tech.id
                            ? 'bg-gradient-to-br from-purple-500 to-blue-500'
                            : 'bg-gradient-to-br from-gray-400 to-gray-500'
                        }`}>
                          {tech.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className={`font-bold ${newTask.assigned_to === tech.id ? 'text-purple-700' : 'text-gray-800'}`}>
                            {tech.name}
                          </p>
                          <p className="text-sm text-gray-600">{tech.email}</p>
                        </div>
                        {newTask.assigned_to === tech.id && (
                          <div className="text-purple-600">
                            <CheckCircle size={24} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {!newTask.assigned_to && (
                  <p className="text-sm text-red-500 font-medium">
                    ⚠️ يرجى اختيار موظف من القائمة أعلاه
                  </p>
                )}
                
                {newTask.assigned_to && (
                  <div className="bg-green-50 border border-green-300 rounded-lg p-3">
                    <p className="text-sm text-green-700 font-medium">
                      ✓ سيتم إرسال المهمة إلى: {technicians.find(t => t.id === newTask.assigned_to)?.name}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button type="submit" className="success-button flex-1" data-testid="submit-task-button">
                  ✓ إنشاء المهمة وإرسالها
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateTask(false)}
                  className="secondary-button flex-1"
                  data-testid="cancel-task-button"
                >
                  إلغاء
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* Tasks Details Modal */}
      {showTasksModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="tasks-details-modal">
          <div className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#667eea' }}>{modalTasksType}</h2>
              <button onClick={() => setShowTasksModal(false)} data-testid="close-tasks-modal">
                <X size={24} />
              </button>
            </div>
            {modalTasks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">لا توجد مهام</p>
            ) : (
              <div className="space-y-4">
                {modalTasks.map((task) => (
                  <div key={task.id} className="card bg-gray-50" data-testid={`modal-task-${task.id}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-2">{task.customer_name}</h3>
                        <div className="space-y-1 text-gray-600 text-sm">
                          <p><strong>الهاتف:</strong> {task.customer_phone}</p>
                          <p><strong>العنوان:</strong> {task.customer_address}</p>
                          <p><strong>العطل:</strong> {task.issue_description}</p>
                          {task.assigned_to_name && (
                            <p><strong>الموظف:</strong> {task.assigned_to_name}</p>
                          )}
                        </div>
                      </div>
                      <span className={`status-badge status-${task.status}`}>
                        {getStatusText(task.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">المهام</h2>
        <div className="space-y-4" data-testid="tasks-list">
          {tasks.map((task) => (
            <div key={task.id} className="card" data-testid={`task-card-${task.id}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">{task.customer_name}</h3>
                  <div className="space-y-1 text-gray-600">
                    <p><strong>الهاتف:</strong> {task.customer_phone}</p>
                    <p><strong>العنوان:</strong> {task.customer_address}</p>
                    <p><strong>العطل:</strong> {task.issue_description}</p>
                    {task.assigned_to_name && (
                      <p><strong>الموظف:</strong> {task.assigned_to_name}</p>
                    )}
                  </div>
                </div>
                <div className="text-left">
                  <span className={`status-badge status-${task.status}`} data-testid={`task-status-${task.id}`}>
                    {getStatusText(task.status)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 flex-wrap">
                {task.status === "in_progress" && (
                  <button
                    onClick={() => viewTaskLocation(task)}
                    className="secondary-button"
                    data-testid={`view-location-button-${task.id}`}
                  >
                    <MapPin className="inline ml-2" size={18} />
                    عرض الموقع
                  </button>
                )}
                
                {/* زر عرض التقرير */}
                <button
                  onClick={() => handleViewReport(task)}
                  className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
                    task.report 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  data-testid={`view-report-button-${task.id}`}
                >
                  <FileText size={18} />
                  {task.report ? 'عرض التقرير' : 'لا يوجد تقرير'}
                </button>
                
                {/* زر التعديل */}
                <button
                  onClick={() => handleEditTask(task)}
                  className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all"
                  data-testid={`edit-task-button-${task.id}`}
                >
                  <Edit size={18} />
                  تعديل
                </button>
                
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
                  data-testid={`delete-task-button-${task.id}`}
                >
                  <Trash2 size={18} />
                  حذف المهمة
                </button>
              </div>

              {task.report && (
                <div 
                  className={`mt-4 p-4 rounded-lg ${task.success !== false ? 'bg-green-50' : 'bg-red-50'}`}
                  data-testid={`task-report-${task.id}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {task.success !== false ? (
                        <>
                          <CheckCircle size={24} className="text-green-600" />
                          <h4 className="font-bold text-green-800 text-lg">✓ المهمة تمت بنجاح</h4>
                        </>
                      ) : (
                        <>
                          <span className="text-red-600 text-2xl">✗</span>
                          <h4 className="font-bold text-red-800 text-lg">✗ المهمة لم تكتمل</h4>
                        </>
                      )}
                    </div>
                    {task.duration_minutes && (
                      <div className="bg-white px-3 py-1 rounded-full">
                        <p className="text-sm font-medium text-gray-700">
                          ⏱️ المدة: {task.duration_minutes} دقيقة
                        </p>
                      </div>
                    )}
                  </div>
                  <p className={`${task.success !== false ? 'text-gray-700' : 'text-red-700'} mb-2`}>
                    {task.report}
                  </p>
                  {task.completed_at && (
                    <p className="text-xs text-gray-500 mt-2">
                      📅 تاريخ الإنهاء: {new Date(task.completed_at).toLocaleString('ar-IQ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Location Modal - Live Tracking */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="location-modal">
          <div className="card max-w-6xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold" style={{ color: '#667eea' }}>
                📍 تتبع مباشر - {selectedTask.customer_name}
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full shadow-sm">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-700 font-bold">مباشر • تحديث تلقائي</span>
                </div>
                <button 
                  onClick={() => {
                    if (selectedTask.locationInterval) {
                      clearInterval(selectedTask.locationInterval);
                    }
                    setSelectedTask(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={28} />
                </button>
              </div>
            </div>
            {locations.length > 0 ? (
              <div>
                {/* Location Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={20} className="text-blue-600" />
                      <h3 className="font-bold text-blue-800">آخر تحديث</h3>
                    </div>
                    <p className="text-gray-700 font-medium">
                      {new Date(locations[0].timestamp).toLocaleString('ar-IQ', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(locations[0].timestamp).toLocaleDateString('ar-IQ')}
                    </p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={20} className="text-green-600" />
                      <h3 className="font-bold text-green-800">عدد التحديثات</h3>
                    </div>
                    <p className="text-3xl font-bold text-green-700">{locations.length}</p>
                    <p className="text-xs text-gray-500 mt-1">نقطة GPS</p>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Play size={20} className="text-purple-600" />
                      <h3 className="font-bold text-purple-800">الحالة</h3>
                    </div>
                    <p className="text-lg font-bold text-purple-700">قيد التنفيذ</p>
                    <p className="text-xs text-gray-500 mt-1">الموظف في الطريق</p>
                  </div>
                </div>
                
                {/* Location History Timeline */}
                {locations.length > 1 && (
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <Clock size={18} />
                      سجل الحركة ({locations.length} موقع)
                    </h3>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {locations.slice(0, 10).map((loc, index) => (
                        <div key={loc.id} className="flex items-center gap-3 text-sm">
                          <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                          <span className="text-gray-600 font-mono text-xs">
                            {new Date(loc.timestamp).toLocaleTimeString('ar-IQ')}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* زر فتح Google Maps */}
                <div className="mt-4 flex gap-3">
                  <a 
                    href={`https://www.google.com/maps?q=${locations[0].latitude},${locations[0].longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-center hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    <MapPin size={20} />
                    فتح في Google Maps
                  </a>
                  <a 
                    href={`https://waze.com/ul?ll=${locations[0].latitude},${locations[0].longitude}&navigate=yes`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-xl font-bold text-center hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Play size={20} />
                    فتح في Waze
                  </a>
                </div>

                {/* عنوان العميل */}
                {selectedTask.customer_address && (
                  <div className="mt-4 bg-yellow-50 p-4 rounded-xl">
                    <h4 className="font-bold text-yellow-800 mb-2">📍 عنوان العميل:</h4>
                    <p className="text-gray-700">{selectedTask.customer_address}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16">
                <MapPin size={64} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">لا توجد بيانات موقع متاحة</p>
                <p className="text-gray-400 text-sm mt-2">سيتم عرض الموقع عند بدء الموظف بالتحرك</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Broadcast Message Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#667eea' }}>
                <Send className="inline ml-2" size={28} />
                إرسال رسالة للموظفين
              </h2>
              <button onClick={() => setShowBroadcastModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="label">نص الرسالة</label>
                <textarea
                  className="input-field"
                  rows="5"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="اكتب رسالتك هنا... (ستصل عبر Telegram)"
                  data-testid="broadcast-message-input"
                />
              </div>
              
              <div>
                <label className="label mb-3">اختر الموظفين</label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {technicians.map((tech) => (
                    <div
                      key={tech.id}
                      onClick={() => {
                        if (selectedTechnicians.includes(tech.id)) {
                          setSelectedTechnicians(selectedTechnicians.filter(id => id !== tech.id));
                        } else {
                          setSelectedTechnicians([...selectedTechnicians, tech.id]);
                        }
                      }}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedTechnicians.includes(tech.id)
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 bg-white hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          selectedTechnicians.includes(tech.id)
                            ? 'bg-gradient-to-br from-purple-500 to-blue-500'
                            : 'bg-gradient-to-br from-gray-400 to-gray-500'
                        }`}>
                          {tech.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-800">{tech.name}</p>
                          <p className="text-xs text-gray-600">{tech.email}</p>
                        </div>
                        {selectedTechnicians.includes(tech.id) && (
                          <CheckCircle size={24} className="text-purple-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {selectedTechnicians.length > 0 && (
                  <div className="mt-3 bg-green-50 border border-green-300 rounded-lg p-3">
                    <p className="text-sm text-green-700 font-medium">
                      ✓ تم اختيار {selectedTechnicians.length} موظف
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={handleSendBroadcast}
                  className="success-button flex-1"
                  data-testid="send-broadcast-button"
                >
                  <Send className="inline ml-2" size={18} />
                  إرسال الرسالة
                </button>
                <button
                  onClick={() => {
                    setShowBroadcastModal(false);
                    setBroadcastMessage("");
                    setSelectedTechnicians([]);
                  }}
                  className="secondary-button flex-1"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <Settings user={user} onClose={() => setShowSettings(false)} />
      )}

      {/* Change Employee Password Modal */}
      {showChangePassword && selectedTechForPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#667eea' }}>
              🔐 تغيير كلمة مرور الموظف
            </h2>
            <p className="text-gray-600 mb-4">الموظف: <strong>{selectedTechForPassword.name}</strong></p>
            <form onSubmit={handleChangeEmployeePassword} className="space-y-4">
              <div>
                <label className="label">كلمة المرور الجديدة *</label>
                <input
                  type="text"
                  className="input-field"
                  value={newPasswordData.password}
                  onChange={(e) => setNewPasswordData({ password: e.target.value })}
                  required
                  placeholder="أدخل كلمة المرور الجديدة"
                />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">⚠️ احفظ كلمة المرور وأرسلها للموظف</p>
              </div>
              <div className="flex gap-4">
                <button type="submit" className="success-button flex-1">
                  تغيير كلمة المرور
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setSelectedTechForPassword(null);
                    setNewPasswordData({ password: "" });
                  }}
                  className="secondary-button flex-1"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Work Sessions Modal */}
      {showWorkSessions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold" style={{ color: '#667eea' }}>
                ⏰ سجل أوقات الموظفين
              </h2>
              <button onClick={() => setShowWorkSessions(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {workSessions.map(({ employee, sessions }) => (
                <div key={employee.id} className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                        {employee.name?.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{employee.name}</h3>
                        <p className="text-gray-500 text-sm">@{employee.username}</p>
                        {employee.daily_hours && (
                          <div className="flex gap-2 mt-1">
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                              🕐 {employee.start_time || '09:00'} - {employee.end_time || '17:00'}
                            </span>
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">
                              ⏱️ {employee.daily_hours} ساعة/يوم
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedEmpForSchedule(employee);
                          setScheduleData({
                            daily_hours: employee.daily_hours || 8,
                            start_time: employee.start_time || "09:00",
                            end_time: employee.end_time || "17:00"
                          });
                          setShowSetScheduleModal(true);
                        }}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2"
                      >
                        <Clock size={16} />
                        تحديد الوقت
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTechForSalary(employee);
                          setShowSalaryAdjustment(true);
                        }}
                        className="bg-gradient-to-r from-orange-500 to-amber-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2"
                      >
                        <DollarSign size={16} />
                        خصم/إضافة
                      </button>
                    </div>
                  </div>

                  {sessions.length > 0 ? (
                    <div className="grid gap-2">
                      <div className="grid grid-cols-5 gap-2 text-xs font-bold text-gray-500 px-3 py-2 bg-gray-100 rounded-lg">
                        <span>التاريخ</span>
                        <span>وقت الدخول</span>
                        <span>وقت الخروج</span>
                        <span>المدة</span>
                        <span>الحالة</span>
                      </div>
                      {sessions.slice(0, 7).map((session, idx) => (
                        <div key={idx} className="grid grid-cols-5 gap-2 items-center bg-white rounded-lg p-3 border border-gray-100 hover:shadow-sm transition-all">
                          <span className="text-sm font-medium">
                            📅 {new Date(session.clock_in).toLocaleDateString('ar-IQ')}
                          </span>
                          <span className="text-sm text-green-600">
                            🟢 {new Date(session.clock_in).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-sm text-red-600">
                            {session.clock_out 
                              ? `🔴 ${new Date(session.clock_out).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}` 
                              : '---'}
                          </span>
                          <span className="text-sm font-bold">
                            {session.actual_hours 
                              ? `${session.actual_hours.toFixed(1)} ساعة` 
                              : '⏳ نشط'}
                          </span>
                          <span className={`text-xs px-3 py-1 rounded-full text-center ${
                            session.status === 'completed' ? 'bg-green-100 text-green-700' :
                            session.status === 'late' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {session.status === 'completed' ? '✓ مكتمل' :
                             session.status === 'late' ? '⚠ مبكر' : '🔵 نشط'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Clock size={48} className="mx-auto mb-2 opacity-30" />
                      <p>لا يوجد سجل حضور</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Set Schedule Modal */}
      {showSetScheduleModal && selectedEmpForSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="set-schedule-modal">
          <div className="card max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold" style={{ color: '#667eea' }}>
                <Clock className="inline ml-2" size={24} />
                تحديد وقت العمل: {selectedEmpForSchedule.name}
              </h2>
              <button onClick={() => setShowSetScheduleModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSetSchedule} className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl">
                <label className="label text-blue-700">عدد الساعات المطلوبة يومياً</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    className="input-field text-center text-2xl font-bold"
                    min="1"
                    max="24"
                    value={scheduleData.daily_hours}
                    onChange={(e) => setScheduleData({ ...scheduleData, daily_hours: e.target.value })}
                    required
                  />
                  <span className="text-lg text-gray-600">ساعة</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-xl">
                  <label className="label text-green-700">🟢 وقت البداية</label>
                  <input
                    type="time"
                    className="input-field text-center text-xl font-bold"
                    value={scheduleData.start_time}
                    onChange={(e) => setScheduleData({ ...scheduleData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div className="bg-red-50 p-4 rounded-xl">
                  <label className="label text-red-700">🔴 وقت النهاية</label>
                  <input
                    type="time"
                    className="input-field text-center text-xl font-bold"
                    value={scheduleData.end_time}
                    onChange={(e) => setScheduleData({ ...scheduleData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="bg-gray-100 p-3 rounded-lg text-center text-sm text-gray-600">
                <Clock className="inline ml-1" size={16} />
                مثال: من الساعة {scheduleData.start_time} إلى {scheduleData.end_time} ({scheduleData.daily_hours} ساعات)
              </div>
              
              <div className="flex gap-3">
                <button type="submit" className="success-button flex-1">
                  ✓ حفظ الوقت
                </button>
                <button type="button" onClick={() => setShowSetScheduleModal(false)} className="secondary-button flex-1">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Adjustment Modal */}
      {showSalaryAdjustment && selectedTechForSalary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#667eea' }}>
              💰 خصم أو إضافة على الراتب
            </h2>
            <p className="text-gray-600 mb-4">الموظف: <strong>{selectedTechForSalary.name}</strong></p>
            <form onSubmit={handleSalaryAdjustment} className="space-y-4">
              <div>
                <label className="label">المبلغ (دينار) *</label>
                <input
                  type="number"
                  className="input-field"
                  value={salaryData.amount}
                  onChange={(e) => setSalaryData({ ...salaryData, amount: e.target.value })}
                  required
                  placeholder="أدخل المبلغ (موجب للإضافة، سالب للخصم)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 أدخل رقم موجب (+) للإضافة أو سالب (-) للخصم
                </p>
              </div>
              <div>
                <label className="label">السبب *</label>
                <textarea
                  className="input-field"
                  rows="3"
                  value={salaryData.reason}
                  onChange={(e) => setSalaryData({ ...salaryData, reason: e.target.value })}
                  required
                  placeholder="مثال: تأخر ساعة عن الدوام"
                />
              </div>
              <div className="flex gap-4">
                <button type="submit" className="success-button flex-1">
                  تسجيل التعديل
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSalaryAdjustment(false);
                    setSelectedTechForSalary(null);
                    setSalaryData({ amount: "", reason: "" });
                  }}
                  className="secondary-button flex-1"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Adjustments Modal (الخصومات والزيادات) */}
      {showAdjustmentsModal && selectedEmployeeForAdjustments && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-purple-600">
                💰 الخصومات والزيادات - {selectedEmployeeForAdjustments.name}
              </h2>
              <button
                onClick={() => {
                  setShowAdjustmentsModal(false);
                  setSelectedEmployeeForAdjustments(null);
                  setEmployeeAdjustments([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={28} />
              </button>
            </div>

            <button
              onClick={() => setShowAddAdjustment(true)}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-bold mb-6"
            >
              ➕ إضافة خصم أو زيادة
            </button>

            {/* Add Adjustment Form */}
            {showAddAdjustment && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-bold mb-4 text-purple-800">إضافة تعديل جديد</h3>
                <form onSubmit={handleAddAdjustment} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-medium mb-2">نوع التعديل</label>
                      <select
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                        value={newAdjustment.adjustment_type}
                        onChange={(e) => setNewAdjustment({ ...newAdjustment, adjustment_type: e.target.value })}
                      >
                        <option value="bonus">✨ زيادة</option>
                        <option value="deduction">⚠️ خصم</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-medium mb-2">المبلغ (دينار)</label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                        value={newAdjustment.amount}
                        onChange={(e) => setNewAdjustment({ ...newAdjustment, amount: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-2">السبب</label>
                    <textarea
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                      rows="3"
                      value={newAdjustment.reason}
                      onChange={(e) => setNewAdjustment({ ...newAdjustment, reason: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-2">التاريخ</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                      value={newAdjustment.date}
                      onChange={(e) => setNewAdjustment({ ...newAdjustment, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="flex gap-4">
                    <button type="submit" className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-all font-bold">
                      حفظ التعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddAdjustment(false);
                        setNewAdjustment({
                          adjustment_type: "bonus",
                          amount: "",
                          reason: "",
                          date: new Date().toISOString().split('T')[0]
                        });
                      }}
                      className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-all font-bold"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Adjustments List */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">السجل الكامل</h3>
              
              {employeeAdjustments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">لا توجد خصومات أو زيادات</p>
                </div>
              ) : (
                employeeAdjustments.map((adj) => (
                  <div key={adj.id} className={`p-4 rounded-lg border-2 ${adj.adjustment_type === 'bonus' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    {editingAdjustment?.id === adj.id ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-gray-700 font-medium mb-2">المبلغ</label>
                            <input
                              type="number"
                              className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                              value={editingAdjustment.amount}
                              onChange={(e) => setEditingAdjustment({ ...editingAdjustment, amount: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-gray-700 font-medium mb-2">السبب</label>
                            <input
                              type="text"
                              className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-purple-400"
                              value={editingAdjustment.reason}
                              onChange={(e) => setEditingAdjustment({ ...editingAdjustment, reason: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateAdjustment(adj.id)}
                            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                          >
                            حفظ
                          </button>
                          <button
                            onClick={() => setEditingAdjustment(null)}
                            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`text-2xl font-bold ${adj.adjustment_type === 'bonus' ? 'text-green-600' : 'text-red-600'}`}>
                              {adj.adjustment_type === 'bonus' ? '✨ زيادة' : '⚠️ خصم'}
                            </span>
                            <span className={`text-3xl font-bold ${adj.adjustment_type === 'bonus' ? 'text-green-700' : 'text-red-700'}`}>
                              {adj.amount.toLocaleString()} دينار
                            </span>
                          </div>
                          <p className="text-gray-700 mb-2"><strong>السبب:</strong> {adj.reason}</p>
                          <p className="text-sm text-gray-500">📅 {new Date(adj.date).toLocaleDateString('ar-IQ')}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingAdjustment(adj)}
                            className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteAdjustment(adj.id)}
                            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* حقوق المبرمج */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 text-center shadow-lg z-40">
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm">تطوير وبرمجة: المهندس أمير بهاء الدين</span>
          <span className="text-indigo-200">|</span>
          <a href="tel:07723042577" className="text-sm hover:text-indigo-200 transition-all flex items-center gap-1">
            <MessageCircle size={14} />
            07723042577
          </a>
        </div>
      </footer>

      {/* Report View Modal */}
      {showReportModal && selectedTaskForReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="report-view-modal">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#667eea' }}>
                <FileText className="inline ml-2" size={28} />
                تقرير المهمة
              </h2>
              <button onClick={() => { setShowReportModal(false); setSelectedTaskForReport(null); }}>
                <X size={24} />
              </button>
            </div>
            
            {/* معلومات المهمة */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <h3 className="font-bold text-lg mb-3 text-gray-800">📋 معلومات المهمة</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">الزبون:</span>
                  <span className="font-medium mr-2">{selectedTaskForReport.customer_name}</span>
                </div>
                <div>
                  <span className="text-gray-500">الهاتف:</span>
                  <span className="font-medium mr-2">{selectedTaskForReport.customer_phone}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">العنوان:</span>
                  <span className="font-medium mr-2">{selectedTaskForReport.customer_address}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">العطل:</span>
                  <span className="font-medium mr-2">{selectedTaskForReport.issue_description}</span>
                </div>
                <div>
                  <span className="text-gray-500">الموظف:</span>
                  <span className="font-medium mr-2">{selectedTaskForReport.assigned_to_name || 'غير معين'}</span>
                </div>
                <div>
                  <span className="text-gray-500">الحالة:</span>
                  <span className={`font-medium mr-2 ${
                    selectedTaskForReport.status === 'completed' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {getStatusText(selectedTaskForReport.status)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* التقرير */}
            {selectedTaskForReport.report ? (
              <div className={`rounded-xl p-4 ${selectedTaskForReport.success !== false ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  {selectedTaskForReport.success !== false ? (
                    <>
                      <CheckCircle size={24} className="text-green-600" />
                      <h3 className="font-bold text-lg text-green-800">✅ المهمة مكتملة بنجاح</h3>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={24} className="text-red-600" />
                      <h3 className="font-bold text-lg text-red-800">❌ المهمة غير مكتملة</h3>
                    </>
                  )}
                </div>
                
                <div className="bg-white rounded-lg p-4 mb-3">
                  <h4 className="font-bold text-gray-700 mb-2">📝 نص التقرير:</h4>
                  <p className="text-gray-800 whitespace-pre-wrap">{selectedTaskForReport.report}</p>
                </div>
                
                {selectedTaskForReport.duration_minutes && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock size={18} />
                    <span>مدة التنفيذ: <strong>{selectedTaskForReport.duration_minutes}</strong> دقيقة</span>
                  </div>
                )}
                
                {selectedTaskForReport.completed_at && (
                  <div className="flex items-center gap-2 text-gray-600 mt-2">
                    <CheckCircle size={18} />
                    <span>تاريخ الإنهاء: <strong>{new Date(selectedTaskForReport.completed_at).toLocaleString('ar-IQ')}</strong></span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 text-center">
                <AlertCircle size={48} className="mx-auto text-yellow-500 mb-3" />
                <h3 className="font-bold text-lg text-yellow-800 mb-2">لا يوجد تقرير بعد</h3>
                <p className="text-yellow-700">الموظف لم يرسل تقرير لهذه المهمة حتى الآن</p>
              </div>
            )}
            
            <button
              onClick={() => { setShowReportModal(false); setSelectedTaskForReport(null); }}
              className="w-full mt-4 secondary-button"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditTaskModal && editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="edit-task-modal">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#667eea' }}>
                <Edit className="inline ml-2" size={28} />
                تعديل المهمة
              </h2>
              <button onClick={() => { setShowEditTaskModal(false); setEditingTask(null); }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div>
                <label className="label">اسم المشترك</label>
                <input
                  type="text"
                  className="input-field"
                  value={editingTask.customer_name}
                  onChange={(e) => setEditingTask({ ...editingTask, customer_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label">رقم الهاتف</label>
                <input
                  type="text"
                  className="input-field"
                  value={editingTask.customer_phone}
                  onChange={(e) => setEditingTask({ ...editingTask, customer_phone: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label">العنوان</label>
                <input
                  type="text"
                  className="input-field"
                  value={editingTask.customer_address}
                  onChange={(e) => setEditingTask({ ...editingTask, customer_address: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label">وصف العطل</label>
                <textarea
                  className="input-field"
                  rows="4"
                  value={editingTask.issue_description}
                  onChange={(e) => setEditingTask({ ...editingTask, issue_description: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label">الموظف المكلف</label>
                <select
                  className="input-field"
                  value={editingTask.assigned_to}
                  onChange={(e) => setEditingTask({ ...editingTask, assigned_to: e.target.value })}
                >
                  <option value="">-- اختر موظف --</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <button type="submit" className="success-button flex-1">
                  ✓ حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => { setShowEditTaskModal(false); setEditingTask(null); }}
                  className="secondary-button flex-1"
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

export default AdminDashboard;
