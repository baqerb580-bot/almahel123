import { useState } from 'react';
import { UserPlus, Edit, Trash2, Shield, X } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EmployeeManagement = ({ 
  system, // 'phones' or 'agents'
  systemName, // 'baqerr' or 'uakel'
  availablePermissions 
}) => {
  const [employees, setEmployees] = useState([]);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [newEmployee, setNewEmployee] = useState({
    username: '',
    password: '',
    name: '',
    role: 'employee',
    permissions: []
  });

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  const fetchEmployees = async () => {
    try {
      const endpoint = system === 'phones' ? '/phones/employees' : '/agents/users';
      const response = await axios.get(`${API}${endpoint}`, getAuthHeaders());
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      const endpoint = system === 'phones' ? '/phones/employees' : '/agents/users';
      await axios.post(`${API}${endpoint}`, newEmployee, getAuthHeaders());
      toast.success('✓ تم إضافة الموظف بنجاح');
      setShowAddEmployee(false);
      setNewEmployee({
        username: '',
        password: '',
        name: '',
        role: 'employee',
        permissions: []
      });
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل إضافة الموظف');
    }
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    try {
      const endpoint = system === 'phones' 
        ? `/phones/employees/${editingEmployee.id}` 
        : `/agents/users/${editingEmployee.id}`;
      await axios.put(`${API}${endpoint}`, editingEmployee, getAuthHeaders());
      toast.success('✓ تم تحديث الموظف بنجاح');
      setEditingEmployee(null);
      fetchEmployees();
    } catch (error) {
      toast.error('فشل تحديث الموظف');
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
    
    try {
      const endpoint = system === 'phones' 
        ? `/phones/employees/${id}` 
        : `/agents/users/${id}`;
      await axios.delete(`${API}${endpoint}`, getAuthHeaders());
      toast.success('✓ تم حذف الموظف بنجاح');
      fetchEmployees();
    } catch (error) {
      toast.error('فشل حذف الموظف');
    }
  };

  const togglePermission = (permission, target = 'new') => {
    const employee = target === 'new' ? newEmployee : editingEmployee;
    const setter = target === 'new' ? setNewEmployee : setEditingEmployee;
    
    const currentPermissions = employee.permissions || [];
    const newPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter(p => p !== permission)
      : [...currentPermissions, permission];
    
    setter({ ...employee, permissions: newPermissions });
  };

  // استدعاء البيانات عند التحميل
  useState(() => {
    fetchEmployees();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">إدارة الموظفين - {systemName}</h2>
        <button
          onClick={() => setShowAddEmployee(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all font-bold flex items-center gap-2"
        >
          <UserPlus size={20} />
          إضافة موظف
        </button>
      </div>

      {/* Employees List */}
      <div className="grid grid-cols-1 gap-4">
        {employees && employees.length > 0 ? (
          employees.map((employee) => (
            <div 
              key={employee.id} 
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border-2 border-gray-100"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{employee.name}</h3>
                  <p className="text-gray-600 mb-2">
                    <span className="font-semibold">اسم المستخدم:</span> {employee.username}
                  </p>
                  <p className="text-gray-600 mb-3">
                    <span className="font-semibold">الدور:</span>{' '}
                    <span className={employee.role === 'admin' ? 'text-red-600 font-bold' : 'text-blue-600'}>
                      {employee.role === 'admin' ? 'مدير' : 'موظف'}
                    </span>
                  </p>
                  
                  {/* الصلاحيات */}
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">الصلاحيات:</p>
                    <div className="flex flex-wrap gap-2">
                      {employee.permissions && employee.permissions.length > 0 ? (
                        employee.permissions.map((permission) => (
                          <span 
                            key={permission}
                            className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
                          >
                            <Shield size={14} />
                            {availablePermissions.find(p => p.value === permission)?.label || permission}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-sm">لا توجد صلاحيات</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingEmployee(employee)}
                    className="bg-yellow-500 text-white p-3 rounded-lg hover:bg-yellow-600 transition-all"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteEmployee(employee.id)}
                    className="bg-red-500 text-white p-3 rounded-lg hover:bg-red-600 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-gray-50 rounded-xl p-12 text-center">
            <p className="text-gray-500 text-lg">لا يوجد موظفون</p>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-blue-600">إضافة موظف جديد</h2>
              <button onClick={() => setShowAddEmployee(false)} className="text-gray-500 hover:text-gray-700">
                <X size={32} />
              </button>
            </div>
            
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">اسم الموظف *</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-blue-400"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">اسم المستخدم *</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-blue-400"
                  value={newEmployee.username}
                  onChange={(e) => setNewEmployee({ ...newEmployee, username: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">كلمة المرور *</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-blue-400"
                  value={newEmployee.password}
                  onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">الدور</label>
                <select
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-blue-400"
                  value={newEmployee.role}
                  onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                >
                  <option value="employee">موظف</option>
                  <option value="admin">مدير</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-3">الصلاحيات</label>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto">
                  {availablePermissions.map((permission) => (
                    <label 
                      key={permission.value}
                      className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-blue-50 cursor-pointer transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={newEmployee.permissions?.includes(permission.value)}
                        onChange={() => togglePermission(permission.value, 'new')}
                        className="w-5 h-5 text-blue-600"
                      />
                      <div>
                        <p className="font-semibold text-gray-800">{permission.label}</p>
                        <p className="text-sm text-gray-500">{permission.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit" 
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all font-bold"
                >
                  إضافة الموظف
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddEmployee(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-all font-bold"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-yellow-600">تعديل الموظف</h2>
              <button onClick={() => setEditingEmployee(null)} className="text-gray-500 hover:text-gray-700">
                <X size={32} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateEmployee} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">اسم الموظف *</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-yellow-400"
                  value={editingEmployee.name}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">كلمة المرور الجديدة (اختياري)</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:outline-none focus:border-yellow-400"
                  value={editingEmployee.password || ''}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, password: e.target.value })}
                  placeholder="اتركه فارغاً إذا لم ترد التغيير"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-3">الصلاحيات</label>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto">
                  {availablePermissions.map((permission) => (
                    <label 
                      key={permission.value}
                      className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-yellow-50 cursor-pointer transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={editingEmployee.permissions?.includes(permission.value)}
                        onChange={() => togglePermission(permission.value, 'edit')}
                        className="w-5 h-5 text-yellow-600"
                      />
                      <div>
                        <p className="font-semibold text-gray-800">{permission.label}</p>
                        <p className="text-sm text-gray-500">{permission.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit" 
                  className="flex-1 bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition-all font-bold"
                >
                  حفظ التعديلات
                </button>
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
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

export default EmployeeManagement;
