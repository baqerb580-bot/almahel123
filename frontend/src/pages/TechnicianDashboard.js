import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { MapPin, CheckCircle, Clock, LogOut, Play, Bell, X, Settings as SettingsIcon, MessageCircle } from "lucide-react";
import { playNotificationSound } from "../utils/notificationSound";
import Settings from "./Settings";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TechnicianDashboard = ({ user, onLogout }) => {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [locationTracking, setLocationTracking] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [report, setReport] = useState("");
  const [taskSuccess, setTaskSuccess] = useState(true); // true = success, false = failed
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [modalTasksType, setModalTasksType] = useState("");
  const [modalTasks, setModalTasks] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  
  // Work Session states
  const [workSession, setWorkSession] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showClockInModal, setShowClockInModal] = useState(false);
  const [clockInPassword, setClockInPassword] = useState("");
  
  // Adjustments states
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [adjustments, setAdjustments] = useState([]);
  
  // Permission-based features states
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState({
    customer_name: "",
    customer_phone: "",
    customer_address: "",
    issue_description: ""
  });
  const [allTasks, setAllTasks] = useState([]); // كل المهام للعرض

  // Check if user has permission
  const hasPermission = (permId) => {
    return user?.permissions?.includes(permId) || false;
  };

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  });

  const sendLocation = useCallback(async (taskId, position) => {
    try {
      await axios.post(
        `${API}/locations`,
        {
          task_id: taskId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        },
        getAuthHeaders()
      );
    } catch (error) {
      console.error("Error sending location:", error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchActiveSession();
    
    // طلب إذن الإشعارات عند تسجيل الدخول (مع التحقق)
    if (typeof Notification !== 'undefined' && Notification.permission === "default") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          toast.success("تم تفعيل الإشعارات - ستصلك إشعارات المهام");
        }
      }).catch(() => {
        console.log("Browser does not support notifications");
      });
    }
    
    // Check for new notifications every 5 seconds
    const interval = setInterval(() => {
      fetchData();
      fetchActiveSession();
    }, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer for work session
  useEffect(() => {
    let timer;
    if (workSession && workSession.status === 'active') {
      timer = setInterval(() => {
        const clockIn = new Date(workSession.clock_in);
        const now = new Date();
        const elapsed = Math.floor((now - clockIn) / 1000); // seconds
        setElapsedTime(elapsed);
        
        // Check if time is up
        const plannedSeconds = workSession.planned_hours * 3600;
        if (elapsed >= plannedSeconds) {
          toast.warning("⚠️ انتهى وقت العمل المحدد!");
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [workSession]);

  const fetchActiveSession = async () => {
    try {
      const response = await axios.get(`${API}/work-session/active`, getAuthHeaders());
      if (response.data) {
        setWorkSession(response.data);
        setElapsedTime(response.data.elapsed_seconds || 0);
      }
    } catch (error) {
      console.error("Error fetching active session:", error);
    }
  };

  const handleClockIn = async (e) => {
    e.preventDefault();
    try {
      // Verify password
      const loginResponse = await axios.post(`${API}/auth/login`, {
        username: user.username,
        password: clockInPassword
      });
      
      if (loginResponse.data) {
        // Clock in
        const response = await axios.post(`${API}/work-session/clock-in`, {}, getAuthHeaders());
        toast.success("✓ تم تسجيل الدخول بنجاح!");
        setShowClockInModal(false);
        setClockInPassword("");
        fetchActiveSession();
      }
    } catch (error) {
      toast.error("كلمة المرور غير صحيحة");
    }
  };

  const handleClockOut = async () => {
    if (!window.confirm("هل أنت متأكد من تسجيل الخروج؟")) return;
    
    try {
      await axios.post(`${API}/work-session/clock-out`, {}, getAuthHeaders());
      toast.success("✓ تم تسجيل الخروج بنجاح!");
      setWorkSession(null);
      setElapsedTime(0);
    } catch (error) {
      toast.error("فشل تسجيل الخروج");
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let watchId;
    let intervalId;
    if (locationTracking && activeTask) {
      if (navigator.geolocation) {
        // Continuous tracking with watchPosition (updates every 1-2 seconds)
        watchId = navigator.geolocation.watchPosition(
          (position) => sendLocation(activeTask.id, position),
          (error) => {
            console.error("Geolocation error:", error);
            toast.error("فشل تحديث الموقع. يرجى التحقق من إعدادات الموقع.");
          },
          { 
            enableHighAccuracy: true, 
            maximumAge: 0, 
            timeout: 5000,
            distanceFilter: 5 // Send update every 5 meters
          }
        );
        
        // Additional aggressive polling every 2 seconds for real-time tracking
        intervalId = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            (position) => sendLocation(activeTask.id, position),
            (error) => console.error("Geolocation polling error:", error),
            { enableHighAccuracy: true, maximumAge: 0 }
          );
        }, 2000); // Every 2 seconds
      }
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [locationTracking, activeTask, sendLocation]);

  const fetchData = async () => {
    try {
      const [tasksRes, statsRes, notifRes, unreadRes] = await Promise.all([
        axios.get(`${API}/tasks?employee_id=${user.id}`, getAuthHeaders()),
        axios.get(`${API}/stats`, getAuthHeaders()),
        axios.get(`${API}/notifications`, getAuthHeaders()),
        axios.get(`${API}/notifications/unread/count`, getAuthHeaders())
      ]);
      setTasks(tasksRes.data);
      setStats(statsRes.data);
      
      // Check for new notifications and play loud notification sound
      if (notifRes.data.length > notifications.length && notifications.length > 0) {
        const newNotif = notifRes.data[0];
        
        // Play loud notification sound
        playNotificationSound();
        
        // Show browser notification (مع التحقق من الدعم)
        if (typeof Notification !== 'undefined' && Notification.permission === "granted") {
          try {
            const notification = new Notification("📢 لديك مهمة جديدة!", {
              body: newNotif.message,
              icon: "/favicon.ico",
              badge: "/favicon.ico",
              vibrate: [200, 100, 200, 100, 200],
              tag: newNotif.id,
              requireInteraction: true,
              silent: false
            });
            
            // Click to open app
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          } catch (error) {
            console.log("Notification error:", error);
          }
        } else if (typeof Notification !== 'undefined' && Notification.permission === "default") {
          // Request permission if not granted
          Notification.requestPermission().then(permission => {
            if (permission === "granted") {
              try {
                new Notification("📢 لديك مهمة جديدة!", {
                  body: newNotif.message,
                  icon: "/favicon.ico",
                  vibrate: [200, 100, 200],
                  requireInteraction: true
                });
              } catch (error) {
                console.log("Notification error:", error);
              }
            }
          }).catch(() => {
            console.log("Notification permission denied");
          });
        }
        
        // Show toast notification (هذا يعمل دائماً)
        toast.info("📢 لديك مهمة جديدة!", {
          description: newNotif.message,
          duration: 10000,
          action: {
            label: "عرض",
            onClick: () => {
              const taskElement = document.querySelector(`[data-testid="task-card-${newNotif.task_id}"]`);
              if (taskElement) {
                taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }
        });
      }
      
      setNotifications(notifRes.data);
      setUnreadCount(unreadRes.data.count);

      const inProgress = tasksRes.data.find(t => t.status === "in_progress");
      if (inProgress && !activeTask) {
        setActiveTask(inProgress);
        setLocationTracking(true);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchAdjustments = async () => {
    try {
      const response = await axios.get(`${API}/adjustments/employee/${user.id}`, getAuthHeaders());
      setAdjustments(response.data);
    } catch (error) {
      console.error("Error fetching adjustments:", error);
      toast.error("فشل جلب الخصومات والزيادات");
    }
  };

  // ============== PERMISSION-BASED FUNCTIONS ==============
  
  // جلب كل المهام (للموظف اللي عنده صلاحية view_tasks)
  const fetchAllTasks = async () => {
    if (!hasPermission('view_tasks')) return;
    try {
      const response = await axios.get(`${API}/tasks`, getAuthHeaders());
      setAllTasks(response.data);
    } catch (error) {
      console.error("Error fetching all tasks:", error);
    }
  };

  // إنشاء مهمة جديدة
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!hasPermission('create_task')) {
      toast.error("ليس لديك صلاحية إنشاء المهام");
      return;
    }
    
    try {
      await axios.post(`${API}/tasks`, {
        ...newTask,
        assigned_to: user.id // تعيين المهمة للموظف نفسه
      }, getAuthHeaders());
      
      toast.success("✓ تم إنشاء المهمة بنجاح");
      setShowCreateTaskModal(false);
      setNewTask({ customer_name: "", customer_phone: "", customer_address: "", issue_description: "" });
      fetchData();
      fetchAllTasks();
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل إنشاء المهمة");
    }
  };

  // تعديل مهمة
  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!hasPermission('edit_task')) {
      toast.error("ليس لديك صلاحية تعديل المهام");
      return;
    }
    
    try {
      await axios.put(`${API}/tasks/${editingTask.id}`, {
        customer_name: editingTask.customer_name,
        customer_phone: editingTask.customer_phone,
        customer_address: editingTask.customer_address,
        issue_description: editingTask.issue_description
      }, getAuthHeaders());
      
      toast.success("✓ تم تعديل المهمة بنجاح");
      setShowEditTaskModal(false);
      setEditingTask(null);
      fetchData();
      fetchAllTasks();
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل تعديل المهمة");
    }
  };

  // حذف مهمة
  const handleDeleteTask = async (taskId) => {
    if (!hasPermission('delete_task')) {
      toast.error("ليس لديك صلاحية حذف المهام");
      return;
    }
    
    try {
      await axios.delete(`${API}/tasks/${taskId}`, getAuthHeaders());
      toast.success("✓ تم حذف المهمة بنجاح");
      fetchData();
      fetchAllTasks();
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل حذف المهمة");
    }
  };

  // جلب كل المهام عند التحميل إذا عنده صلاحية
  useEffect(() => {
    if (hasPermission('view_tasks')) {
      fetchAllTasks();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleAcceptTask = async (task) => {
    // Request location permission with better message
    if (!navigator.geolocation) {
      toast.error("المتصفح لا يدعم تحديد الموقع");
      return;
    }

    // Show permission request dialog
    const permissionGranted = await new Promise((resolve) => {
      toast.info("يرجى السماح بالوصول للموقع لتتبع المهمة بشكل دقيق");
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          toast.success("✓ تم السماح بالوصول للموقع - سيتم تتبع موقعك تلقائياً");
          resolve(true);
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            toast.error("⚠️ تم رفض الوصول للموقع! يجب السماح بالموقع لإكمال المهمة.\n\nالرجاء:\n1. الضغط على أيقونة القفل/الموقع في المتصفح\n2. اختيار 'السماح' للموقع", {
              duration: 8000
            });
            resolve(false);
          } else {
            toast.error("فشل الحصول على الموقع. تأكد من تفعيل GPS");
            resolve(false);
          }
        },
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });

    if (!permissionGranted) {
      return;
    }

    try {
      await axios.post(`${API}/tasks/${task.id}/accept`, {}, getAuthHeaders());
      toast.success("تم قبول المهمة بنجاح");
      fetchData();
    } catch (error) {
      console.error("Error accepting task:", error);
      toast.error(error.response?.data?.detail || "فشل قبول المهمة");
    }
  };

  const handleStartTask = async (task) => {
    try {
      await axios.post(`${API}/tasks/${task.id}/start`, {}, getAuthHeaders());
      setActiveTask(task);
      setLocationTracking(true);
      toast.success("تم بدء المهمة - جاري تتبع موقعك");
      fetchData();
    } catch (error) {
      console.error("Error starting task:", error);
      toast.error(error.response?.data?.detail || "فشل بدء المهمة");
    }
  };

  const handleCompleteTask = async () => {
    if (!report.trim()) {
      toast.error("يرجى كتابة التقرير");
      return;
    }

    try {
      await axios.post(
        `${API}/tasks/${activeTask.id}/complete`,
        { 
          task_id: activeTask.id, 
          report_text: report, 
          images: [],
          success: taskSuccess 
        },
        getAuthHeaders()
      );
      toast.success(taskSuccess ? "✓ تم إنهاء المهمة بنجاح" : "⚠️ تم تسجيل المهمة كغير مكتملة");
      setActiveTask(null);
      setLocationTracking(false);
      setShowReportModal(false);
      setReport("");
      setTaskSuccess(true);
      fetchData();
    } catch (error) {
      toast.error("فشل إنهاء المهمة");
    }
  };

  const markNotificationRead = async (notificationId, taskId) => {
    try {
      await axios.patch(`${API}/notifications/${notificationId}/read`, {}, getAuthHeaders());
      fetchData();
      // Optionally, scroll to the task or highlight it
      const taskElement = document.querySelector(`[data-testid="task-card-${taskId}"]`);
      if (taskElement) {
        taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        taskElement.style.border = '2px solid #667eea';
        setTimeout(() => {
          taskElement.style.border = '';
        }, 3000);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
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

  return (
    <div className="min-h-screen p-6" data-testid="technician-dashboard">
      {/* Work Session Timer - Always Visible */}
      {workSession && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs opacity-90">الوقت المطلوب</p>
              <p className="text-2xl font-bold">{workSession.planned_hours} ساعة</p>
            </div>
            <div className="w-px h-12 bg-white/30"></div>
            <div className="text-center">
              <p className="text-xs opacity-90">الوقت المنقضي</p>
              <p className="text-3xl font-bold tabular-nums">{formatTime(elapsedTime)}</p>
            </div>
            <div className="w-px h-12 bg-white/30"></div>
            <div className="text-center">
              <p className="text-xs opacity-90">المتبقي</p>
              <p className={`text-2xl font-bold ${(workSession.planned_hours * 3600 - elapsedTime) < 600 ? 'text-red-200 animate-pulse' : ''}`}>
                {formatTime(Math.max(0, workSession.planned_hours * 3600 - elapsedTime))}
              </p>
            </div>
            <button
              onClick={handleClockOut}
              className="bg-white/20 hover:bg-white/30 px-6 py-2 rounded-full transition-all font-bold flex items-center gap-2"
            >
              <LogOut size={18} />
              تسجيل خروج
            </button>
          </div>
        </div>
      )}

      {/* Clock In Button - Large and Prominent */}
      {!workSession && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <button
            onClick={() => setShowClockInModal(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-12 py-6 rounded-2xl shadow-2xl hover:shadow-3xl transition-all text-2xl font-bold animate-pulse"
          >
            ⏰ تسجيل دخول
          </button>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8" style={{ marginTop: workSession ? '100px' : '100px' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#667eea' }}>لوحة موظف الصيانة</h1>
            <p className="text-gray-600">مرحباً، {user.name}</p>
            {/* عرض الصلاحيات */}
            {user.permissions && user.permissions.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {user.permissions.includes('create_task') && (
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">✓ إنشاء مهمة</span>
                )}
                {user.permissions.includes('edit_task') && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">✓ تعديل مهمة</span>
                )}
                {user.permissions.includes('delete_task') && (
                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">✓ حذف مهمة</span>
                )}
                {user.permissions.includes('view_tasks') && (
                  <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">✓ عرض المهام</span>
                )}
                {user.permissions.includes('assign_tasks') && (
                  <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">✓ تعيين المهام</span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-3 flex-wrap">
            {/* زر إنشاء مهمة - يظهر فقط إذا عنده صلاحية */}
            {hasPermission('create_task') && (
              <button 
                onClick={() => setShowCreateTaskModal(true)} 
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:shadow-lg transition-all"
                data-testid="create-task-button"
              >
                ➕ إنشاء مهمة جديدة
              </button>
            )}
            
            {/* زر عرض كل المهام - يظهر فقط إذا عنده صلاحية */}
            {hasPermission('view_tasks') && (
              <button 
                onClick={fetchAllTasks} 
                className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:shadow-lg transition-all"
                data-testid="view-all-tasks-button"
              >
                📋 عرض كل المهام ({allTasks.length})
              </button>
            )}
            
            {/* Adjustments Button */}
            <button 
              onClick={async () => {
                await fetchAdjustments();
                setShowAdjustments(true);
              }} 
              className="secondary-button"
              data-testid="adjustments-button"
            >
              💰 الخصومات والزيادات
            </button>
            
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
                    onClick={() => markNotificationRead(notif.id, notif.task_id)}
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

      {/* Location Tracking Status */}
      {locationTracking && activeTask && (
        <div className="max-w-7xl mx-auto mb-6" data-testid="location-tracking-status">
          <div className="card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>
            <div className="flex items-center gap-3">
              <MapPin size={24} className="animate-pulse" />
              <div>
                <p className="font-bold">جاري تتبع موقعك</p>
                <p className="text-sm text-white/80">المهمة النشطة: {activeTask.customer_name}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div 
            className="stat-card cursor-pointer hover:scale-105 transition-transform"
            onClick={() => showTasksByStatus("all", "مهامي")}
            data-testid="stat-my-tasks"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">مهامي</p>
                <p className="text-3xl font-bold">{stats.my_tasks}</p>
              </div>
              <Clock size={40} className="opacity-80" />
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:scale-105 transition-transform" 
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}
            onClick={() => showTasksByStatus("pending", "المهام قيد الانتظار")}
            data-testid="stat-my-pending"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">قيد الانتظار</p>
                <p className="text-3xl font-bold">{stats.my_pending}</p>
              </div>
              <Clock size={40} className="opacity-80" />
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:scale-105 transition-transform" 
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white' }}
            onClick={() => showTasksByStatus("in_progress", "المهام قيد التنفيذ")}
            data-testid="stat-my-in-progress"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">قيد التنفيذ</p>
                <p className="text-3xl font-bold">{stats.my_in_progress}</p>
              </div>
              <Play size={40} className="opacity-80" />
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:scale-105 transition-transform" 
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}
            onClick={() => showTasksByStatus("completed", "المهام المكتملة")}
            data-testid="stat-my-completed"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">مكتملة</p>
                <p className="text-3xl font-bold">{stats.my_completed}</p>
              </div>
              <CheckCircle size={40} className="opacity-80" />
            </div>
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
        <h2 className="text-2xl font-bold mb-4">مهامي</h2>
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
                  </div>
                </div>
                <div className="text-left">
                  <span className={`status-badge status-${task.status}`} data-testid={`task-status-${task.id}`}>
                    {getStatusText(task.status)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                {task.status === "pending" && (
                  <button
                    onClick={() => handleAcceptTask(task)}
                    className="success-button"
                    data-testid={`accept-task-button-${task.id}`}
                  >
                    قبول المهمة
                  </button>
                )}

                {task.status === "accepted" && (
                  <button
                    onClick={() => handleStartTask(task)}
                    className="primary-button"
                    data-testid={`start-task-button-${task.id}`}
                  >
                    <Play className="inline ml-2" size={18} />
                    بدء المهمة
                  </button>
                )}

                {task.status === "in_progress" && task.id === activeTask?.id && (
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="success-button"
                    data-testid={`complete-task-button-${task.id}`}
                  >
                    <CheckCircle className="inline ml-2" size={18} />
                    إنهاء المهمة
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="report-modal">
          <div className="card max-w-2xl w-full">
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#667eea' }}>تقرير إنهاء المهمة</h2>
            <div className="space-y-6">
              {/* Task Status Selection */}
              <div>
                <label className="label mb-3">حالة المهمة</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setTaskSuccess(true)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      taskSuccess 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-300 bg-white hover:border-green-300'
                    }`}
                    data-testid="task-success-button"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        taskSuccess ? 'bg-green-500' : 'bg-gray-200'
                      }`}>
                        <CheckCircle size={28} className={taskSuccess ? 'text-white' : 'text-gray-400'} />
                      </div>
                      <span className={`font-bold ${taskSuccess ? 'text-green-700' : 'text-gray-600'}`}>
                        تمت بنجاح ✓
                      </span>
                      <span className="text-xs text-gray-500">العطل تم إصلاحه بالكامل</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTaskSuccess(false)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      !taskSuccess 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-300 bg-white hover:border-red-300'
                    }`}
                    data-testid="task-failed-button"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        !taskSuccess ? 'bg-red-500' : 'bg-gray-200'
                      }`}>
                        <span className={`text-2xl ${!taskSuccess ? 'text-white' : 'text-gray-400'}`}>✗</span>
                      </div>
                      <span className={`font-bold ${!taskSuccess ? 'text-red-700' : 'text-gray-600'}`}>
                        لم تكتمل ✗
                      </span>
                      <span className="text-xs text-gray-500">لم يتم حل المشكلة</span>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="label">تفاصيل العمل المنجز</label>
                <textarea
                  className="input-field"
                  rows="6"
                  value={report}
                  onChange={(e) => setReport(e.target.value)}
                  placeholder={taskSuccess 
                    ? "اكتب تفاصيل العمل المنجز، الأعطال التي تم إصلاحها، وأي ملاحظات أخرى..." 
                    : "اكتب سبب عدم اكتمال المهمة، المشاكل التي واجهتها، والإجراءات المطلوبة..."
                  }
                  data-testid="report-text-input"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleCompleteTask}
                  className={taskSuccess ? "success-button flex-1" : "danger-button flex-1"}
                  data-testid="submit-report-button"
                >
                  {taskSuccess ? "✓ إرسال التقرير - تمت بنجاح" : "✗ إرسال التقرير - لم تكتمل"}
                </button>
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setTaskSuccess(true);
                  }}
                  className="secondary-button flex-1"
                  data-testid="cancel-report-button"
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

      {/* Clock In Modal */}
      {showClockInModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <h2 className="text-3xl font-bold mb-6 text-center" style={{ color: '#667eea' }}>
              ⏰ تسجيل دخول
            </h2>
            <p className="text-gray-600 text-center mb-6">
              أدخل كلمة المرور للتأكيد
            </p>
            <form onSubmit={handleClockIn} className="space-y-4">
              <div>
                <label className="label">كلمة المرور *</label>
                <input
                  type="password"
                  className="input-field text-2xl text-center"
                  value={clockInPassword}
                  onChange={(e) => setClockInPassword(e.target.value)}
                  required
                  placeholder="••••••"
                  autoFocus
                />
              </div>
              <div className="flex gap-4">
                <button type="submit" className="success-button flex-1 text-lg py-4">
                  ✓ بدء العمل
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowClockInModal(false);
                    setClockInPassword("");
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

      {/* Adjustments Modal */}
      {showAdjustments && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-purple-600">
                💰 الخصومات والزيادات
              </h2>
              <button
                onClick={() => setShowAdjustments(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={28} />
              </button>
            </div>

            <div className="space-y-4">
              {adjustments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">لا توجد خصومات أو زيادات</p>
                </div>
              ) : (
                adjustments.map((adj) => (
                  <div key={adj.id} className={`p-4 rounded-lg border-2 ${adj.adjustment_type === 'bonus' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
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
                    </div>
                  </div>
                ))
              )}
              
              {adjustments.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <h3 className="text-lg font-bold text-blue-800 mb-2">الملخص</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">إجمالي الزيادات</p>
                      <p className="text-2xl font-bold text-green-600">
                        {adjustments.filter(a => a.adjustment_type === 'bonus').reduce((sum, a) => sum + a.amount, 0).toLocaleString()} د.ع
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">إجمالي الخصومات</p>
                      <p className="text-2xl font-bold text-red-600">
                        {adjustments.filter(a => a.adjustment_type === 'deduction').reduce((sum, a) => sum + a.amount, 0).toLocaleString()} د.ع
                      </p>
                    </div>
                  </div>
                </div>
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

      {/* ============== CREATE TASK MODAL ============== */}
      {showCreateTaskModal && hasPermission('create_task') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#667eea' }}>➕ إنشاء مهمة جديدة</h2>
              <button onClick={() => setShowCreateTaskModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الزبون</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  placeholder="أدخل اسم الزبون"
                  value={newTask.customer_name}
                  onChange={(e) => setNewTask({ ...newTask, customer_name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  placeholder="07xxxxxxxxx"
                  value={newTask.customer_phone}
                  onChange={(e) => setNewTask({ ...newTask, customer_phone: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  placeholder="أدخل العنوان الكامل"
                  value={newTask.customer_address}
                  onChange={(e) => setNewTask({ ...newTask, customer_address: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">وصف العطل</label>
                <textarea
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  rows="3"
                  placeholder="اشرح المشكلة..."
                  value={newTask.issue_description}
                  onChange={(e) => setNewTask({ ...newTask, issue_description: e.target.value })}
                  required
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all"
                >
                  ✓ إنشاء المهمة
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============== EDIT TASK MODAL ============== */}
      {showEditTaskModal && editingTask && hasPermission('edit_task') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold" style={{ color: '#667eea' }}>✏️ تعديل المهمة</h2>
              <button onClick={() => { setShowEditTaskModal(false); setEditingTask(null); }} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الزبون</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  value={editingTask.customer_name}
                  onChange={(e) => setEditingTask({ ...editingTask, customer_name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  value={editingTask.customer_phone}
                  onChange={(e) => setEditingTask({ ...editingTask, customer_phone: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  value={editingTask.customer_address}
                  onChange={(e) => setEditingTask({ ...editingTask, customer_address: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">وصف العطل</label>
                <textarea
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  rows="3"
                  value={editingTask.issue_description}
                  onChange={(e) => setEditingTask({ ...editingTask, issue_description: e.target.value })}
                  required
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all"
                >
                  ✓ حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => { setShowEditTaskModal(false); setEditingTask(null); }}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============== ALL TASKS VIEW (VIEW_TASKS PERMISSION) ============== */}
      {hasPermission('view_tasks') && allTasks.length > 0 && (
        <div className="max-w-7xl mx-auto mb-8 mt-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#667eea' }}>📋 كل المهام ({allTasks.length})</h2>
            <div className="grid gap-4">
              {allTasks.map((task) => (
                <div key={task.id} className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{task.customer_name}</h3>
                      <p className="text-gray-600 text-sm">{task.customer_phone}</p>
                      <p className="text-gray-500 text-sm">{task.customer_address}</p>
                      <p className="text-gray-700 mt-1">{task.issue_description}</p>
                      <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
                        task.status === 'completed' ? 'bg-green-100 text-green-700' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        task.status === 'accepted' ? 'bg-purple-100 text-purple-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {task.status === 'completed' ? '✓ مكتملة' :
                         task.status === 'in_progress' ? '▶ قيد التنفيذ' :
                         task.status === 'accepted' ? '✓ مقبولة' : '⏳ قيد الانتظار'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {hasPermission('edit_task') && task.status !== 'completed' && (
                        <button
                          onClick={() => { setEditingTask(task); setShowEditTaskModal(true); }}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium"
                        >
                          ✏️ تعديل
                        </button>
                      )}
                      {hasPermission('delete_task') && (
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium"
                        >
                          🗑️ حذف
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicianDashboard;
