from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN = "8224031678:AAG149d2LhnU1YYsNpcQeDMZO7eOIiPQR70"

async def send_telegram_message(chat_id: str, message: str, task_id: str = None, customer_id: str = None, debt_id: str = None):
    """إرسال رسالة Telegram مع زر للانتقال المباشر"""
    if not chat_id:
        return
    
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        
        # تحديد الرابط حسب النوع
        app_url = os.environ.get('APP_URL', 'https://ai-code-analyzer-1.preview.emergentagent.com')
        if task_id:
            app_url = f"{app_url}/?task={task_id}"
        elif customer_id:
            app_url = f"{app_url}/?customer={customer_id}"
        elif debt_id:
            app_url = f"{app_url}/?debt={debt_id}"
        
        keyboard = {
            "inline_keyboard": [[
                {
                    "text": "✅ فتح المهمة",
                    "url": app_url
                }
            ]]
        }
        
        async with httpx.AsyncClient() as client:
            await client.post(url, json={
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "HTML",
                "reply_markup": keyboard
            })
    except Exception as e:
        print(f"Telegram error: {e}")

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 168  # 7 days instead of 24 hours

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Default accounts for different systems
DEFAULT_ACCOUNTS = [
    {
        "username": "admin",
        "password": "198212",
        "name": "المدير",
        "role": "admin",
        "system": "tasks"
    },
    {
        "username": "gzbm",
        "password": "1010",
        "name": "مدير الديون",
        "role": "admin",
        "system": "debts"
    },
    {
        "username": "baqerr",
        "password": "11223300",
        "name": "مدير صيانة الهواتف",
        "role": "admin",
        "system": "phones"
    },
    {
        "username": "uakel",
        "password": "1111",
        "name": "مدير محاسبة الوكلاء",
        "role": "admin",
        "system": "agents"
    }
]

# Initialize default accounts
@app.on_event("startup")
async def create_default_accounts():
    for account in DEFAULT_ACCOUNTS:
        user = await db.users.find_one({"username": account["username"]})
        if not user:
            user_id = str(uuid.uuid4())
            user_doc = {
                "id": user_id,
                "username": account["username"],
                "name": account["name"],
                "password": hash_password(account["password"]),
                "role": account["role"],
                "system": account["system"],
                "permissions": [],
                "telegram_chat_id": None,
                "delegated_admin_telegram_id": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user_doc)
            print(f"✓ Default account created: {account['username']} ({account['system']})")

# Background task for checking delayed tasks
import asyncio

async def check_delayed_tasks():
    """التحقق من المهام المتأخرة وإرسال تنبيهات"""
    while True:
        try:
            # الانتظار 10 دقائق قبل كل فحص
            await asyncio.sleep(600)  # 10 minutes
            
            now = datetime.now(timezone.utc)
            
            # جلب المهام غير المكتملة
            tasks = await db.tasks.find({
                "status": {"$in": ["pending", "accepted", "in_progress"]}
            }).to_list(1000)
            
            for task in tasks:
                created_at = datetime.fromisoformat(task["created_at"].replace('Z', '+00:00'))
                time_diff = (now - created_at).total_seconds() / 3600  # بالساعات
                
                # إذا مر أكثر من ساعة على المهمة
                if time_diff >= 1:
                    # عدد التنبيهات المرسلة
                    alerts_sent = task.get("delay_alerts_sent", 0)
                    
                    # إرسال حتى 3 تنبيهات
                    if alerts_sent < 3:
                        # جلب بيانات الموظف
                        employee = await db.users.find_one({"id": task.get("assigned_to")})
                        admin = await db.users.find_one({"system": "tasks", "role": "admin"})
                        
                        delay_hours = int(time_diff)
                        delay_minutes = int((time_diff - delay_hours) * 60)
                        
                        message = f"""
⚠️ <b>تنبيه تأخير مهمة!</b> (تنبيه {alerts_sent + 1}/3)

👥 <b>الزبون:</b> {task['customer_name']}
📍 <b>العنوان:</b> {task['customer_address']}
🔧 <b>العطل:</b> {task['issue_description']}
👤 <b>الموظف:</b> {task.get('assigned_to_name', 'غير معين')}

⏰ <b>مدة التأخير:</b> {delay_hours} ساعة و {delay_minutes} دقيقة
📊 <b>الحالة:</b> {task['status']}
                        """
                        
                        # إرسال للموظف
                        if employee and employee.get("telegram_chat_id"):
                            await send_telegram_message(employee["telegram_chat_id"], message, task_id=task["id"])
                        
                        # إرسال للمدير
                        if admin and admin.get("telegram_chat_id"):
                            await send_telegram_message(admin["telegram_chat_id"], message, task_id=task["id"])
                        
                        # إرسال للمدير المفوض
                        if admin and admin.get("delegated_admin_telegram_id"):
                            await send_telegram_message(admin["delegated_admin_telegram_id"], message, task_id=task["id"])
                        
                        # تحديث عداد التنبيهات
                        await db.tasks.update_one(
                            {"id": task["id"]},
                            {"$set": {"delay_alerts_sent": alerts_sent + 1}}
                        )
                        
                        print(f"⚠️ Delay alert {alerts_sent + 1} sent for task {task['id']}")
                        
        except Exception as e:
            print(f"Error in check_delayed_tasks: {e}")

@app.on_event("startup")
async def start_background_tasks():
    """بدء المهام الخلفية"""
    asyncio.create_task(check_delayed_tasks())
    asyncio.create_task(check_salary_reminder())
    print("✓ Background tasks started (delayed tasks + salary reminder)")

# Models
class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    name: str
    password: str
    role: str = "employee"
    system: str
    permissions: List[str] = []
    telegram_chat_id: Optional[str] = None
    delegated_admin_telegram_id: Optional[str] = None

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    username: str
    name: str
    role: str
    system: str
    permissions: List[str]
    created_at: str
    telegram_chat_id: Optional[str] = None

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class TokenResponse(BaseModel):
    token: str
    user: User

# Task Models (نظام المهام الحالي)
class TaskCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_address: str
    issue_description: str
    assigned_to: Optional[str] = None

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    customer_name: str
    customer_phone: str
    customer_address: str
    issue_description: str
    status: str
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_by: str
    created_at: str
    accepted_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    report: Optional[str] = None
    report_images: Optional[List[str]] = None
    success: Optional[bool] = True
    duration_minutes: Optional[int] = None
    rating: Optional[int] = None
    rating_comment: Optional[str] = None

# Debt Models (نظام الديون)
class DebtCreate(BaseModel):
    customer_name: str
    customer_phone: str
    product_description: str  # وصف السلعة
    total_amount: float  # المبلغ الكلي
    paid_amount: float  # المبلغ المدفوع
    created_date: Optional[str] = None  # تاريخ أخذ الدين
    due_date: str  # تاريخ موعد التسديد
    customer_telegram_id: Optional[str] = None

class DebtPayment(BaseModel):
    debt_id: str
    amount: float
    notes: Optional[str] = None

# Employee Adjustments Models (الخصومات والزيادات)
class AdjustmentCreate(BaseModel):
    employee_id: str
    adjustment_type: str  # "deduction" or "bonus"
    amount: float
    reason: str
    date: str

class AdjustmentUpdate(BaseModel):
    amount: float
    reason: str


class Debt(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    customer_name: str
    customer_phone: str
    product_description: str
    total_amount: float
    paid_amount: float
    remaining_amount: float
    due_date: str
    status: str  # active, paid, overdue
    customer_telegram_id: Optional[str]
    created_by: str
    created_at: str
    payments: List[dict]

# Phone Repair Models (نظام صيانة الهواتف)
class PhoneRepairCreate(BaseModel):
    customer_name: str
    customer_phone: str
    phone_model: str
    issue_description: str
    repair_cost: float
    parts_used: List[dict]  # [{"name": "شاشة", "cost": 50000}]
    paid_amount: float
    due_date: Optional[str] = None
    customer_telegram_id: Optional[str] = None

class PhoneRepair(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    customer_name: str
    customer_phone: str
    phone_model: str
    issue_description: str
    repair_cost: float
    parts_used: List[dict]
    paid_amount: float
    remaining_amount: float
    status: str  # pending, in_progress, completed, paid
    due_date: Optional[str]
    customer_telegram_id: Optional[str]
    created_by: str
    created_at: str
    completed_at: Optional[str]

class PhonePart(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    phone_model: str
    part_name: str
    cost: float
    quantity: int
    created_at: str

# Work Session Models (نظام تسجيل الدخول/الخروج)
class WorkSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    employee_id: str
    employee_name: str
    system: str
    clock_in: str
    clock_out: Optional[str]
    planned_hours: float
    actual_hours: Optional[float]
    status: str  # active, completed, late
    notes: Optional[str]

class EmployeeSchedule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    daily_hours: float
    start_time: str  # "18:00"
    end_time: str  # "00:00"

class SalaryAdjustment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    employee_id: str
    employee_name: str
    amount: float  # positive = bonus, negative = deduction
    reason: str
    created_by: str
    created_at: str

# ============== SALARY SYSTEM MODELS (نظام الرواتب) ==============

class EmployeeSalarySetup(BaseModel):
    """إعداد راتب الموظف"""
    employee_id: str
    base_salary: float  # الراتب الأساسي
    salary_day: int = 1  # يوم استلام الراتب (1-28)

class EmployeeLoan(BaseModel):
    """سلفة الموظف"""
    model_config = ConfigDict(extra="ignore")
    id: str
    employee_id: str
    employee_name: str
    amount: float
    reason: str
    loan_date: str
    is_paid: bool = False  # هل تم خصمها من الراتب
    paid_date: Optional[str] = None
    created_by: str
    created_at: str

class LoanCreate(BaseModel):
    employee_id: str
    amount: float
    reason: str

class SalaryPayment(BaseModel):
    """دفعة راتب"""
    model_config = ConfigDict(extra="ignore")
    id: str
    employee_id: str
    employee_name: str
    base_salary: float  # الراتب الأساسي
    total_deductions: float  # إجمالي الخصومات
    total_bonuses: float  # إجمالي الزيادات
    total_loans: float  # إجمالي السلف
    final_salary: float  # الراتب النهائي
    payment_month: str  # الشهر (YYYY-MM)
    payment_date: str
    notes: Optional[str] = None
    created_by: str
    created_at: str

class SalaryPaymentCreate(BaseModel):
    employee_id: str
    notes: Optional[str] = None

# Helper Functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_token(user_id: str, role: str, system: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "sub": user_id,
        "role": role,
        "system": system,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "API is running", "status": "ok"}

# Auth Routes
@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"username": credentials.username})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="اسم المستخدم أو كلمة السر غير صحيحة")
    
    token = create_token(user["id"], user["role"], user["system"])
    user_response = User(
        id=user["id"],
        username=user["username"],
        name=user["name"],
        role=user["role"],
        system=user["system"],
        permissions=user.get("permissions", []),
        telegram_chat_id=user.get("telegram_chat_id"),
        created_at=user["created_at"]
    )
    
    return TokenResponse(token=token, user=user_response)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return User(**current_user)

@api_router.post("/auth/change-password")
async def change_password(password_data: PasswordChange, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]})
    if not user or not verify_password(password_data.old_password, user["password"]):
        raise HTTPException(status_code=400, detail="الرمز القديم غير صحيح")
    
    new_hashed = hash_password(password_data.new_password)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"password": new_hashed}}
    )
    
    return {"message": "تم تغيير الرمز بنجاح"}

@api_router.post("/users/{user_id}/change-password")
async def admin_change_user_password(user_id: str, new_password: str, current_user: dict = Depends(get_current_user)):
    """تغيير كلمة مرور موظف (للمدير فقط)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    new_hashed = hash_password(new_password)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password": new_hashed}}
    )
    
    return {"message": "تم تغيير كلمة المرور بنجاح"}

@api_router.post("/auth/change-username")
async def change_username(new_username: str, current_user: dict = Depends(get_current_user)):
    """تغيير اليوزر للمستخدم الحالي"""
    # التحقق من عدم وجود اليوزر
    existing = await db.users.find_one({"username": new_username})
    if existing and existing["id"] != current_user["id"]:
        raise HTTPException(status_code=400, detail="اسم المستخدم موجود مسبقاً")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"username": new_username}}
    )
    
    return {"message": "تم تغيير اسم المستخدم بنجاح"}

class TelegramUpdate(BaseModel):
    telegram_chat_id: str

@api_router.patch("/users/{user_id}/telegram")
async def update_telegram_id(user_id: str, data: TelegramUpdate, current_user: dict = Depends(get_current_user)):
    """تحديث Telegram Chat ID للمستخدم"""
    # التحقق من أن المستخدم يعدل بياناته الخاصة أو أنه مدير
    if current_user["id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"telegram_chat_id": data.telegram_chat_id}}
    )
    
    return {"message": "تم تحديث Telegram ID بنجاح"}


# User Management (للمدير)
@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    # التحقق من عدم وجود المستخدم
    existing = await db.users.find_one({"username": user_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="اسم المستخدم موجود مسبقاً")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "username": user_data.username,
        "name": user_data.name,
        "password": hash_password(user_data.password),
        "role": user_data.role,
        "system": current_user["system"],  # نفس نظام المدير
        "permissions": user_data.permissions,
        "telegram_chat_id": user_data.telegram_chat_id,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    return User(**user_doc)

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    users = await db.users.find(
        {"system": current_user["system"]},
        {"_id": 0, "password": 0}
    ).to_list(1000)
    return users

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    await db.users.delete_one({"id": user_id, "system": current_user["system"]})
    return {"message": "تم حذف المستخدم بنجاح"}

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, user_data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    # التحقق من وجود المستخدم
    existing_user = await db.users.find_one({"id": user_id, "system": current_user["system"]})
    if not existing_user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    # بناء التحديث
    update_fields = {}
    
    if "username" in user_data and user_data["username"]:
        # التحقق من عدم وجود اسم مستخدم مكرر
        existing = await db.users.find_one({
            "username": user_data["username"], 
            "id": {"$ne": user_id},
            "system": current_user["system"]
        })
        if existing:
            raise HTTPException(status_code=400, detail="اسم المستخدم موجود مسبقاً")
        update_fields["username"] = user_data["username"]
    
    if "name" in user_data and user_data["name"]:
        update_fields["name"] = user_data["name"]
    
    if "password" in user_data and user_data["password"]:
        update_fields["password"] = pwd_context.hash(user_data["password"])
    
    if "permissions" in user_data:
        update_fields["permissions"] = user_data["permissions"]
    
    if "telegram_chat_id" in user_data:
        update_fields["telegram_chat_id"] = user_data["telegram_chat_id"]
    
    if update_fields:
        await db.users.update_one(
            {"id": user_id, "system": current_user["system"]},
            {"$set": update_fields}
        )
    
    return {"message": "تم تحديث المستخدم بنجاح"}

# ============== TASKS SYSTEM ENDPOINTS ==============

@api_router.get("/tasks")
async def get_tasks(employee_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    if current_user["system"] != "tasks":
        return []
    
    # إذا كان موظف، يرى فقط مهامه
    if current_user["role"] != "admin":
        query = {"assigned_to": current_user["id"]}
    # إذا كان مدير ويوجد employee_id filter
    elif employee_id:
        query = {"assigned_to": employee_id}
    # المدير يرى كل المهام
    else:
        query = {}
    
    tasks = await db.tasks.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return tasks

@api_router.post("/tasks")
async def create_task(task_data: TaskCreate, current_user: dict = Depends(get_current_user)):
    if current_user["system"] != "tasks":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص للمهام فقط")
    
    task_id = str(uuid.uuid4())
    task_doc = {
        "id": task_id,
        "customer_name": task_data.customer_name,
        "customer_phone": task_data.customer_phone,
        "customer_address": task_data.customer_address,
        "issue_description": task_data.issue_description,
        "status": "pending",
        "assigned_to": task_data.assigned_to,
        "assigned_to_name": None,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "accepted_at": None,
        "started_at": None,
        "completed_at": None,
        "report": None,
        "report_images": None,
        "success": True,
        "duration_minutes": None,
        "rating": None,
        "rating_comment": None
    }
    
    # Get assigned technician name
    if task_data.assigned_to:
        tech = await db.users.find_one({"id": task_data.assigned_to})
        if tech:
            task_doc["assigned_to_name"] = tech["name"]
            
            # Send Telegram notification to technician
            if tech.get("telegram_chat_id"):
                message = f"""
🔔 <b>مهمة جديدة!</b>

👤 <b>الزبون:</b> {task_data.customer_name}
📞 <b>الهاتف:</b> {task_data.customer_phone}
📍 <b>العنوان:</b> {task_data.customer_address}
🔧 <b>العطل:</b> {task_data.issue_description}
⏰ <b>التاريخ:</b> {datetime.now().strftime('%Y-%m-%d %H:%M')}
                """
                await send_telegram_message(tech["telegram_chat_id"], message, task_id=task_id)
    
    await db.tasks.insert_one(task_doc)
    return {"message": "تم إنشاء المهمة بنجاح", "task_id": task_id}

# Model for task update
class TaskUpdate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_address: str
    issue_description: str
    assigned_to: Optional[str] = None

@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, task_data: TaskUpdate, current_user: dict = Depends(get_current_user)):
    """تحديث مهمة"""
    if current_user["system"] != "tasks":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص للمهام فقط")
    
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    
    update_data = {
        "customer_name": task_data.customer_name,
        "customer_phone": task_data.customer_phone,
        "customer_address": task_data.customer_address,
        "issue_description": task_data.issue_description,
    }
    
    # تحديث الموظف المكلف إذا تغير
    if task_data.assigned_to:
        tech = await db.users.find_one({"id": task_data.assigned_to})
        if tech:
            update_data["assigned_to"] = task_data.assigned_to
            update_data["assigned_to_name"] = tech["name"]
            
            # إرسال إشعار للموظف الجديد إذا تغير
            if task.get("assigned_to") != task_data.assigned_to:
                if tech.get("telegram_chat_id"):
                    message = f"""
🔄 <b>تم تحديث مهمة!</b>

👤 <b>الزبون:</b> {task_data.customer_name}
📞 <b>الهاتف:</b> {task_data.customer_phone}
📍 <b>العنوان:</b> {task_data.customer_address}
🔧 <b>العطل:</b> {task_data.issue_description}
⏰ <b>التاريخ:</b> {datetime.now().strftime('%Y-%m-%d %H:%M')}
                    """
                    await send_telegram_message(tech["telegram_chat_id"], message, task_id=task_id)
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    return {"message": "تم تحديث المهمة بنجاح"}

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["system"] != "tasks":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص للمهام فقط")
    
    await db.tasks.delete_one({"id": task_id})
    return {"message": "تم حذف المهمة بنجاح"}

@api_router.post("/tasks/{task_id}/accept")
async def accept_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """قبول مهمة من قبل الموظف"""
    if current_user["system"] != "tasks":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص للمهام فقط")
    
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    
    # التحقق من أن المهمة معينة لهذا الموظف
    if task.get("assigned_to") != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="هذه المهمة ليست معينة لك")
    
    await db.tasks.update_one(
        {"id": task_id},
        {
            "$set": {
                "status": "accepted",
                "accepted_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # إرسال إشعار للمدير
    admin = await db.users.find_one({"system": "tasks", "role": "admin"})
    if admin and admin.get("telegram_chat_id"):
        message = f"""
✅ <b>تم قبول المهمة</b>

👤 <b>الموظف:</b> {current_user['name']}
👥 <b>الزبون:</b> {task['customer_name']}
📍 <b>العنوان:</b> {task['customer_address']}
⏰ <b>وقت القبول:</b> {datetime.now().strftime('%Y-%m-%d %H:%M')}
        """
        await send_telegram_message(admin["telegram_chat_id"], message, task_id=task_id)
    
    return {"message": "تم قبول المهمة بنجاح"}



@api_router.post("/tasks/{task_id}/start")
async def start_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """بدء تنفيذ مهمة"""
    if current_user["system"] != "tasks":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص للمهام فقط")
    
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    
    # التحقق من أن المهمة معينة لهذا الموظف
    if task.get("assigned_to") != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="هذه المهمة ليست معينة لك")
    
    # التحقق من أن المهمة مقبولة
    if task.get("status") != "accepted":
        raise HTTPException(status_code=400, detail="يجب قبول المهمة أولاً")
    
    await db.tasks.update_one(
        {"id": task_id},
        {
            "$set": {
                "status": "in_progress",
                "started_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "تم بدء المهمة بنجاح"}

# Model for task completion with report
class TaskCompleteRequest(BaseModel):
    task_id: Optional[str] = None
    report_text: str
    images: Optional[List[str]] = []
    success: bool = True

@api_router.post("/tasks/{task_id}/complete")
async def complete_task(task_id: str, report_data: Optional[TaskCompleteRequest] = None, current_user: dict = Depends(get_current_user)):
    """إكمال مهمة مع تقرير"""
    if current_user["system"] != "tasks":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص للمهام فقط")
    
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    
    # التحقق من أن المهمة معينة لهذا الموظف
    if task.get("assigned_to") != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="هذه المهمة ليست معينة لك")
    
    # حساب مدة المهمة بالدقائق
    duration_minutes = None
    if task.get("started_at"):
        started_at = datetime.fromisoformat(task["started_at"].replace('Z', '+00:00'))
        completed_at = datetime.now(timezone.utc)
        duration_minutes = int((completed_at - started_at).total_seconds() / 60)
    
    # تحديث المهمة مع التقرير
    update_data = {
        "status": "completed",
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "duration_minutes": duration_minutes
    }
    
    # إضافة التقرير إذا تم إرساله
    if report_data:
        update_data["report"] = report_data.report_text
        update_data["report_images"] = report_data.images or []
        update_data["success"] = report_data.success
    
    await db.tasks.update_one(
        {"id": task_id},
        {"$set": update_data}
    )
    
    # إرسال إشعار للمدير عبر Telegram
    admin = await db.users.find_one({"system": "tasks", "role": "admin"})
    if admin and admin.get("telegram_chat_id"):
        success_status = "✅ مكتملة بنجاح" if (not report_data or report_data.success) else "❌ غير مكتملة"
        report_text = report_data.report_text if report_data else "لا يوجد تقرير"
        
        message = f"""
📋 <b>تقرير مهمة</b>

👤 <b>الموظف:</b> {current_user['name']}
👥 <b>الزبون:</b> {task['customer_name']}
📍 <b>العنوان:</b> {task['customer_address']}

📊 <b>الحالة:</b> {success_status}
📝 <b>التقرير:</b> {report_text}
⏱️ <b>المدة:</b> {duration_minutes or 0} دقيقة
⏰ <b>وقت الإنهاء:</b> {datetime.now().strftime('%Y-%m-%d %H:%M')}
        """
        await send_telegram_message(admin["telegram_chat_id"], message, task_id=task_id)
        
        # إرسال للمدير المفوض أيضاً
        if admin.get("delegated_admin_telegram_id"):
            await send_telegram_message(admin["delegated_admin_telegram_id"], message, task_id=task_id)
    
    return {"message": "تم إكمال المهمة بنجاح"}

@api_router.get("/technicians")
async def get_technicians(current_user: dict = Depends(get_current_user)):
    if current_user["system"] != "tasks":
        return []
    
    technicians = await db.users.find(
        {"system": "tasks", "role": "employee"},
        {"_id": 0, "password": 0}
    ).to_list(1000)
    return technicians

@api_router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    if current_user["system"] != "tasks":
        return {}
    
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(10000)
    
    return {
        "total_tasks": len(tasks),
        "pending": len([t for t in tasks if t.get("status") == "pending"]),
        "accepted": len([t for t in tasks if t.get("status") == "accepted"]),
        "in_progress": len([t for t in tasks if t.get("status") == "in_progress"]),
        "completed": len([t for t in tasks if t.get("status") == "completed"])
    }

@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    return notifications

@api_router.get("/notifications/unread/count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({
        "user_id": current_user["id"],
        "read": False
    })
    return {"count": count}

# ============== DEBTS SYSTEM (نظام الديون) ==============

@api_router.post("/debts")
async def create_debt(debt_data: DebtCreate, current_user: dict = Depends(get_current_user)):
    if current_user["system"] != "debts":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص للديون فقط")
    
    # التحقق من وجود ديون سابقة للزبون
    existing_debts = await db.debts.find({
        "customer_phone": debt_data.customer_phone,
        "status": {"$in": ["active", "overdue"]}
    }, {"_id": 0}).to_list(100)
    
    # حساب المبلغ المتبقي
    remaining = debt_data.total_amount - debt_data.paid_amount
    
    # معالجة تاريخ أخذ الدين
    if debt_data.created_date:
        try:
            if 'T' in debt_data.created_date:
                created_date_obj = datetime.fromisoformat(debt_data.created_date.replace('Z', '+00:00'))
                created_date_str = created_date_obj.strftime('%Y-%m-%d')
            else:
                created_date_str = debt_data.created_date
        except:
            created_date_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    else:
        created_date_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    
    # تحديد الحالة
    try:
        # محاولة parse التاريخ
        if 'T' in debt_data.due_date:
            due_date_obj = datetime.fromisoformat(debt_data.due_date.replace('Z', '+00:00'))
            due_date_str = due_date_obj.strftime('%Y-%m-%d')
        else:
            due_date_str = debt_data.due_date
            # تحويل إلى timezone-aware datetime
            due_date_obj = datetime.strptime(debt_data.due_date, '%Y-%m-%d').replace(tzinfo=timezone.utc)
    except:
        # إذا فشل، استخدم اليوم + 30 يوم
        due_date_obj = datetime.now(timezone.utc) + timedelta(days=30)
        due_date_str = due_date_obj.strftime('%Y-%m-%d')
    
    now = datetime.now(timezone.utc)
    
    if remaining <= 0:
        status = "paid"
    elif now > due_date_obj:
        status = "overdue"
    else:
        status = "active"
    
    debt_id = str(uuid.uuid4())
    debt_doc = {
        "id": debt_id,
        "customer_name": debt_data.customer_name,
        "customer_phone": debt_data.customer_phone,
        "product_description": debt_data.product_description,
        "total_amount": debt_data.total_amount,
        "paid_amount": debt_data.paid_amount,
        "remaining_amount": remaining,
        "created_date": created_date_str,
        "due_date": due_date_str,
        "status": status,
        "customer_telegram_id": debt_data.customer_telegram_id or "",
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "payments": []
    }
    
    await db.debts.insert_one(debt_doc)
    
    # إنشاء رسالة الإشعار
    if existing_debts:
        total_existing = sum(d["remaining_amount"] for d in existing_debts)
        notification_message = f"""
⚠️ <b>تنبيه: زبون عليه ديون سابقة!</b>

👤 <b>الزبون:</b> {debt_data.customer_name}
📞 <b>الهاتف:</b> {debt_data.customer_phone}

💰 <b>الديون السابقة:</b> {total_existing:,.0f} دينار
💵 <b>الدين الجديد:</b> {remaining:,.0f} دينار
📊 <b>المجموع الكلي:</b> {total_existing + remaining:,.0f} دينار
        """
    else:
        notification_message = f"""
📝 <b>تم إضافة دين جديد</b>

👤 <b>الزبون:</b> {debt_data.customer_name}
📞 <b>الهاتف:</b> {debt_data.customer_phone}
🛍️ <b>السلعة:</b> {debt_data.product_description}

💰 <b>المبلغ الكلي:</b> {debt_data.total_amount:,.0f} دينار
✅ <b>المبلغ المدفوع:</b> {debt_data.paid_amount:,.0f} دينار
⚠️ <b>المبلغ المتبقي:</b> {remaining:,.0f} دينار

📅 <b>تاريخ الاستحقاق:</b> {due_date_str}
        """
    
    # إرسال إشعار للمدراء
    admins = await db.users.find({"system": "debts", "role": "admin"}).to_list(100)
    for admin in admins:
        if admin.get("telegram_chat_id"):
            await send_telegram_message(admin["telegram_chat_id"], notification_message)
    
    # إرسال إشعار للمستخدم الحالي إذا كان لديه Telegram
    if current_user.get("telegram_chat_id"):
        await send_telegram_message(current_user["telegram_chat_id"], notification_message, debt_id=debt_id)
    
    # إرسال إشعار للزبون إذا كان لديه Telegram
    if debt_data.customer_telegram_id:
        customer_message = f"""
📋 <b>فاتورة دين جديدة</b>

👤 <b>الاسم:</b> {debt_data.customer_name}
🛍️ <b>السلعة:</b> {debt_data.product_description}
💰 <b>المبلغ الكلي:</b> {debt_data.total_amount:,.0f} دينار
💵 <b>المدفوع:</b> {debt_data.paid_amount:,.0f} دينار
💳 <b>المتبقي:</b> {remaining:,.0f} دينار
📅 <b>موعد التسديد:</b> {due_date_obj.strftime('%Y-%m-%d')}
        """
        await send_telegram_message(debt_data.customer_telegram_id, customer_message, debt_id=debt_id)
    
    return {"message": "تم إضافة الدين بنجاح", "id": debt_id}

@api_router.get("/debts")
async def get_debts(
    search: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user["system"] != "debts":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص للديون فقط")
    
    query = {}
    if search:
        query["$or"] = [
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"customer_phone": {"$regex": search, "$options": "i"}}
        ]
    
    if status and status != "all":
        query["status"] = status
    
    debts = await db.debts.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return debts

# ============== EMPLOYEE ADJUSTMENTS (الخصومات والزيادات) ==============

@api_router.post("/adjustments")
async def create_adjustment(adjustment: AdjustmentCreate, current_user: dict = Depends(get_current_user)):
    """إضافة خصم أو زيادة للموظف"""
    if current_user["system"] != "tasks" or current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    # جلب بيانات الموظف
    employee = await db.users.find_one({"id": adjustment.employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    
    adjustment_id = str(uuid.uuid4())
    adjustment_doc = {
        "id": adjustment_id,
        "employee_id": adjustment.employee_id,
        "employee_name": employee["name"],
        "adjustment_type": adjustment.adjustment_type,
        "amount": adjustment.amount,
        "reason": adjustment.reason,
        "date": adjustment.date,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.adjustments.insert_one(adjustment_doc)
    
    adj_type_ar = "خصم" if adjustment.adjustment_type == "deduction" else "زيادة"
    
    # إرسال إشعار للموظف
    if employee.get("telegram_chat_id"):
        employee_message = f"""
{'⚠️' if adjustment.adjustment_type == 'deduction' else '✨'} <b>تم إضافة {adj_type_ar} على راتبك</b>

💰 <b>المبلغ:</b> {adjustment.amount:,.0f} دينار عراقي
📝 <b>السبب:</b> {adjustment.reason}
📅 <b>التاريخ:</b> {adjustment.date}

يرجى مراجعة المدير لمزيد من التفاصيل.
        """
        await send_telegram_message(employee["telegram_chat_id"], employee_message)
    
    # إرسال إشعار للمدير
    admin = await db.users.find_one({"system": "tasks", "role": "admin"})
    if admin and admin.get("telegram_chat_id"):
        admin_message = f"""
{'⚠️' if adjustment.adjustment_type == 'deduction' else '✨'} <b>تم إضافة {adj_type_ar}</b>

👤 <b>الموظف:</b> {employee['name']}
💰 <b>المبلغ:</b> {adjustment.amount:,.0f} دينار
📝 <b>السبب:</b> {adjustment.reason}
📅 <b>التاريخ:</b> {adjustment.date}
        """
        await send_telegram_message(admin["telegram_chat_id"], admin_message)
    
    # إنشاء إشعار في قاعدة البيانات للموظف
    notification_doc = {
        "id": str(uuid.uuid4()),
        "user_id": adjustment.employee_id,
        "type": "adjustment",
        "message": f"تم إضافة {adj_type_ar}: {adjustment.amount:,.0f} دينار - {adjustment.reason}",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification_doc)
    
    return {"message": "تم إضافة التعديل بنجاح", "id": adjustment_id}

@api_router.get("/adjustments/employee/{employee_id}")
async def get_employee_adjustments(employee_id: str, current_user: dict = Depends(get_current_user)):
    """الحصول على خصومات وزيادات الموظف"""
    if current_user["system"] != "tasks":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص للمهام فقط")
    
    # الموظف يمكنه رؤية خصوماته فقط، المدير يمكنه رؤية كل الخصومات
    if current_user["role"] != "admin" and current_user["id"] != employee_id:
        raise HTTPException(status_code=403, detail="يمكنك رؤية خصوماتك فقط")
    
    adjustments = await db.adjustments.find({"employee_id": employee_id}).sort("date", -1).to_list(length=1000)
    return adjustments

@api_router.put("/adjustments/{adjustment_id}")
async def update_adjustment(adjustment_id: str, data: AdjustmentUpdate, current_user: dict = Depends(get_current_user)):
    """تعديل خصم أو زيادة"""
    if current_user["system"] != "tasks" or current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    await db.adjustments.update_one(
        {"id": adjustment_id},
        {"$set": {
            "amount": data.amount,
            "reason": data.reason
        }}
    )
    
    return {"message": "تم تحديث التعديل بنجاح"}

@api_router.delete("/adjustments/{adjustment_id}")
async def delete_adjustment(adjustment_id: str, current_user: dict = Depends(get_current_user)):
    """حذف خصم أو زيادة"""
    if current_user["system"] != "tasks" or current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    await db.adjustments.delete_one({"id": adjustment_id})
    return {"message": "تم حذف التعديل بنجاح"}

# ============== SALARY MANAGEMENT SYSTEM (نظام إدارة الرواتب) ==============

@api_router.post("/employees/{employee_id}/salary-setup")
async def setup_employee_salary(employee_id: str, salary_data: EmployeeSalarySetup, current_user: dict = Depends(get_current_user)):
    """إعداد راتب الموظف"""
    if current_user["system"] != "tasks" or current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    employee = await db.users.find_one({"id": employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    
    await db.users.update_one(
        {"id": employee_id},
        {"$set": {
            "base_salary": salary_data.base_salary,
            "salary_day": salary_data.salary_day
        }}
    )
    
    return {"message": "تم إعداد الراتب بنجاح"}

@api_router.get("/employees/{employee_id}/salary-info")
async def get_employee_salary_info(employee_id: str, current_user: dict = Depends(get_current_user)):
    """الحصول على معلومات راتب الموظف الكاملة"""
    if current_user["system"] != "tasks":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص للمهام فقط")
    
    # الموظف يمكنه رؤية راتبه فقط، المدير يمكنه رؤية الكل
    if current_user["role"] != "admin" and current_user["id"] != employee_id:
        raise HTTPException(status_code=403, detail="يمكنك رؤية راتبك فقط")
    
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0, "password": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    
    # جلب السلف غير المدفوعة
    current_month = datetime.now(timezone.utc).strftime('%Y-%m')
    unpaid_loans = await db.employee_loans.find({
        "employee_id": employee_id,
        "is_paid": False
    }, {"_id": 0}).to_list(1000)
    
    # جلب الخصومات والزيادات للشهر الحالي
    adjustments = await db.adjustments.find({
        "employee_id": employee_id,
        "date": {"$regex": f"^{current_month}"}
    }, {"_id": 0}).to_list(1000)
    
    # حساب الإجماليات
    total_loans = sum(loan["amount"] for loan in unpaid_loans)
    total_deductions = sum(adj["amount"] for adj in adjustments if adj["adjustment_type"] == "deduction")
    total_bonuses = sum(adj["amount"] for adj in adjustments if adj["adjustment_type"] == "bonus")
    
    base_salary = employee.get("base_salary", 0)
    final_salary = base_salary - total_deductions + total_bonuses - total_loans
    
    return {
        "employee": employee,
        "base_salary": base_salary,
        "salary_day": employee.get("salary_day", 1),
        "total_loans": total_loans,
        "total_deductions": total_deductions,
        "total_bonuses": total_bonuses,
        "final_salary": max(0, final_salary),
        "unpaid_loans": unpaid_loans,
        "current_month_adjustments": adjustments
    }

# ============== LOANS SYSTEM (نظام السلف) ==============

@api_router.post("/loans")
async def create_loan(loan_data: LoanCreate, current_user: dict = Depends(get_current_user)):
    """إضافة سلفة للموظف"""
    if current_user["system"] != "tasks" or current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    employee = await db.users.find_one({"id": loan_data.employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    
    loan_id = str(uuid.uuid4())
    loan_doc = {
        "id": loan_id,
        "employee_id": loan_data.employee_id,
        "employee_name": employee["name"],
        "amount": loan_data.amount,
        "reason": loan_data.reason,
        "loan_date": datetime.now(timezone.utc).strftime('%Y-%m-%d'),
        "is_paid": False,
        "paid_date": None,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.employee_loans.insert_one(loan_doc)
    
    # إرسال إشعار للموظف
    if employee.get("telegram_chat_id"):
        message = f"""
💰 <b>تم تسجيل سلفة</b>

💵 <b>المبلغ:</b> {loan_data.amount:,.0f} دينار
📝 <b>السبب:</b> {loan_data.reason}
📅 <b>التاريخ:</b> {datetime.now().strftime('%Y-%m-%d')}

⚠️ سيتم خصم هذا المبلغ من راتبك القادم
        """
        await send_telegram_message(employee["telegram_chat_id"], message)
    
    # إشعار في قاعدة البيانات
    notification_doc = {
        "id": str(uuid.uuid4()),
        "user_id": loan_data.employee_id,
        "type": "loan",
        "message": f"تم تسجيل سلفة: {loan_data.amount:,.0f} دينار - {loan_data.reason}",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification_doc)
    
    return {"message": "تم إضافة السلفة بنجاح", "id": loan_id}

@api_router.get("/loans/employee/{employee_id}")
async def get_employee_loans(employee_id: str, current_user: dict = Depends(get_current_user)):
    """الحصول على سلف الموظف"""
    if current_user["system"] != "tasks":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص للمهام فقط")
    
    if current_user["role"] != "admin" and current_user["id"] != employee_id:
        raise HTTPException(status_code=403, detail="يمكنك رؤية سلفك فقط")
    
    loans = await db.employee_loans.find({"employee_id": employee_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return loans

@api_router.delete("/loans/{loan_id}")
async def delete_loan(loan_id: str, current_user: dict = Depends(get_current_user)):
    """حذف سلفة"""
    if current_user["system"] != "tasks" or current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    await db.employee_loans.delete_one({"id": loan_id})
    return {"message": "تم حذف السلفة بنجاح"}

# ============== SALARY PAYMENTS (تسليم الرواتب) ==============

@api_router.post("/salary-payments")
async def create_salary_payment(payment_data: SalaryPaymentCreate, current_user: dict = Depends(get_current_user)):
    """تسليم راتب موظف"""
    if current_user["system"] != "tasks" or current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    employee = await db.users.find_one({"id": payment_data.employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    
    current_month = datetime.now(timezone.utc).strftime('%Y-%m')
    
    # التحقق من عدم تسليم الراتب مسبقاً لهذا الشهر
    existing_payment = await db.salary_payments.find_one({
        "employee_id": payment_data.employee_id,
        "payment_month": current_month
    })
    if existing_payment:
        raise HTTPException(status_code=400, detail="تم تسليم راتب هذا الشهر مسبقاً")
    
    # جلب السلف غير المدفوعة
    unpaid_loans = await db.employee_loans.find({
        "employee_id": payment_data.employee_id,
        "is_paid": False
    }).to_list(1000)
    
    # جلب الخصومات والزيادات للشهر الحالي
    adjustments = await db.adjustments.find({
        "employee_id": payment_data.employee_id,
        "date": {"$regex": f"^{current_month}"}
    }).to_list(1000)
    
    # حساب الإجماليات
    total_loans = sum(loan["amount"] for loan in unpaid_loans)
    total_deductions = sum(adj["amount"] for adj in adjustments if adj["adjustment_type"] == "deduction")
    total_bonuses = sum(adj["amount"] for adj in adjustments if adj["adjustment_type"] == "bonus")
    
    base_salary = employee.get("base_salary", 0)
    final_salary = base_salary - total_deductions + total_bonuses - total_loans
    final_salary = max(0, final_salary)
    
    payment_id = str(uuid.uuid4())
    payment_doc = {
        "id": payment_id,
        "employee_id": payment_data.employee_id,
        "employee_name": employee["name"],
        "base_salary": base_salary,
        "total_deductions": total_deductions,
        "total_bonuses": total_bonuses,
        "total_loans": total_loans,
        "final_salary": final_salary,
        "payment_month": current_month,
        "payment_date": datetime.now(timezone.utc).isoformat(),
        "notes": payment_data.notes,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.salary_payments.insert_one(payment_doc)
    
    # تحديث السلف كمدفوعة
    for loan in unpaid_loans:
        await db.employee_loans.update_one(
            {"id": loan["id"]},
            {"$set": {
                "is_paid": True,
                "paid_date": datetime.now(timezone.utc).isoformat()
            }}
        )
    
    # إرسال إشعار للموظف
    if employee.get("telegram_chat_id"):
        message = f"""
💵 <b>تم تسليم راتبك!</b>

👤 <b>الموظف:</b> {employee['name']}
📅 <b>الشهر:</b> {current_month}

💰 <b>الراتب الأساسي:</b> {base_salary:,.0f} دينار
➖ <b>الخصومات:</b> {total_deductions:,.0f} دينار
➕ <b>الزيادات:</b> {total_bonuses:,.0f} دينار
💸 <b>السلف:</b> {total_loans:,.0f} دينار

✅ <b>الراتب النهائي:</b> {final_salary:,.0f} دينار
        """
        await send_telegram_message(employee["telegram_chat_id"], message)
    
    return {
        "message": "تم تسليم الراتب بنجاح",
        "id": payment_id,
        "final_salary": final_salary,
        "details": {
            "base_salary": base_salary,
            "total_deductions": total_deductions,
            "total_bonuses": total_bonuses,
            "total_loans": total_loans
        }
    }

@api_router.get("/salary-payments/employee/{employee_id}")
async def get_employee_salary_payments(employee_id: str, current_user: dict = Depends(get_current_user)):
    """سجل رواتب الموظف"""
    if current_user["system"] != "tasks":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص للمهام فقط")
    
    if current_user["role"] != "admin" and current_user["id"] != employee_id:
        raise HTTPException(status_code=403, detail="يمكنك رؤية رواتبك فقط")
    
    payments = await db.salary_payments.find({"employee_id": employee_id}, {"_id": 0}).sort("payment_date", -1).to_list(1000)
    return payments

@api_router.get("/salary-payments/all")
async def get_all_salary_payments(month: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """جلب جميع الرواتب (للمدير)"""
    if current_user["system"] != "tasks" or current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    query = {}
    if month:
        query["payment_month"] = month
    
    payments = await db.salary_payments.find(query, {"_id": 0}).sort("payment_date", -1).to_list(1000)
    return payments

@api_router.get("/employees/salary-summary")
async def get_employees_salary_summary(current_user: dict = Depends(get_current_user)):
    """ملخص رواتب جميع الموظفين للشهر الحالي"""
    if current_user["system"] != "tasks" or current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    current_month = datetime.now(timezone.utc).strftime('%Y-%m')
    
    employees = await db.users.find(
        {"system": "tasks", "role": "employee"},
        {"_id": 0, "password": 0}
    ).to_list(1000)
    
    summary = []
    for emp in employees:
        # جلب السلف غير المدفوعة
        unpaid_loans = await db.employee_loans.find({
            "employee_id": emp["id"],
            "is_paid": False
        }).to_list(1000)
        
        # جلب الخصومات والزيادات
        adjustments = await db.adjustments.find({
            "employee_id": emp["id"],
            "date": {"$regex": f"^{current_month}"}
        }).to_list(1000)
        
        # التحقق من تسليم الراتب
        payment = await db.salary_payments.find_one({
            "employee_id": emp["id"],
            "payment_month": current_month
        })
        
        total_loans = sum(loan["amount"] for loan in unpaid_loans)
        total_deductions = sum(adj["amount"] for adj in adjustments if adj["adjustment_type"] == "deduction")
        total_bonuses = sum(adj["amount"] for adj in adjustments if adj["adjustment_type"] == "bonus")
        
        base_salary = emp.get("base_salary", 0)
        final_salary = base_salary - total_deductions + total_bonuses - total_loans
        
        summary.append({
            "employee_id": emp["id"],
            "employee_name": emp["name"],
            "base_salary": base_salary,
            "total_loans": total_loans,
            "total_deductions": total_deductions,
            "total_bonuses": total_bonuses,
            "final_salary": max(0, final_salary),
            "is_paid": payment is not None,
            "payment_date": payment["payment_date"] if payment else None
        })
    
    return summary

# ============== SALARY REMINDER BACKGROUND TASK ==============

async def check_salary_reminder():
    """إرسال تذكير بموعد الراتب"""
    while True:
        try:
            await asyncio.sleep(3600 * 12)  # كل 12 ساعة
            
            now = datetime.now(timezone.utc)
            tomorrow = now + timedelta(days=1)
            
            # جلب الموظفين
            employees = await db.users.find({"system": "tasks", "role": "employee"}).to_list(1000)
            
            for emp in employees:
                salary_day = emp.get("salary_day", 1)
                
                # إذا كان غداً موعد الراتب
                if tomorrow.day == salary_day:
                    if emp.get("telegram_chat_id"):
                        message = f"""
📅 <b>تذكير: غداً موعد استلام الراتب!</b>

👤 <b>الموظف:</b> {emp['name']}
💰 <b>الراتب الأساسي:</b> {emp.get('base_salary', 0):,.0f} دينار

يرجى مراجعة المدير لاستلام راتبك.
                        """
                        await send_telegram_message(emp["telegram_chat_id"], message)
                        print(f"✓ Salary reminder sent to {emp['name']}")
                        
        except Exception as e:
            print(f"Error in check_salary_reminder: {e}")

@api_router.get("/debts/customer/{phone}", response_model=List[Debt])
async def get_customer_debts(phone: str, current_user: dict = Depends(get_current_user)):
    if current_user["system"] != "debts":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص للديون فقط")
    
    debts = await db.debts.find(
        {"customer_phone": phone},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return debts

@api_router.post("/debts/{debt_id}/pay")
async def pay_debt(debt_id: str, payment: DebtPayment, current_user: dict = Depends(get_current_user)):
    if current_user["system"] != "debts":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص للديون فقط")
    
    debt = await db.debts.find_one({"id": debt_id})
    if not debt:
        raise HTTPException(status_code=404, detail="الدين غير موجود")
    
    # تحديث المبلغ المدفوع
    new_paid = debt["paid_amount"] + payment.amount
    new_remaining = debt["total_amount"] - new_paid
    
    # تحديد الحالة
    new_status = "paid" if new_remaining <= 0 else debt["status"]
    
    # إضافة الدفعة إلى السجل
    payment_record = {
        "amount": payment.amount,
        "date": datetime.now(timezone.utc).isoformat(),
        "notes": payment.notes,
        "by": current_user["name"]
    }
    
    await db.debts.update_one(
        {"id": debt_id},
        {
            "$set": {
                "paid_amount": new_paid,
                "remaining_amount": new_remaining,
                "status": new_status
            },
            "$push": {"payments": payment_record}
        }
    )
    
    # إرسال إشعار للزبون
    if debt.get("customer_telegram_id"):
        message = f"""
✅ <b>تم تسجيل دفعة جديدة</b>

👤 <b>الاسم:</b> {debt['customer_name']}
💵 <b>المبلغ المدفوع:</b> {payment.amount:,.0f} دينار
💳 <b>المتبقي:</b> {new_remaining:,.0f} دينار
📅 <b>التاريخ:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        """
        await send_telegram_message(debt["customer_telegram_id"], message, debt_id=debt_id)
    
    return {"message": "تم تسجيل الدفعة بنجاح", "remaining": new_remaining}

@api_router.put("/debts/{debt_id}")
async def update_debt(debt_id: str, debt_data: DebtCreate, current_user: dict = Depends(get_current_user)):
    if current_user["system"] != "debts":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص للديون فقط")
    
    debt = await db.debts.find_one({"id": debt_id})
    if not debt:
        raise HTTPException(status_code=404, detail="الدين غير موجود")
    
    # حساب المبلغ المتبقي
    remaining = debt_data.total_amount - debt_data.paid_amount
    
    # تحديد الحالة
    try:
        if debt_data.due_date:
            # محاولة parse التاريخ
            if 'T' in debt_data.due_date:
                due_date_obj = datetime.fromisoformat(debt_data.due_date.replace('Z', '+00:00'))
                due_date_str = due_date_obj.strftime('%Y-%m-%d')
            else:
                due_date_str = debt_data.due_date
                due_date_obj = datetime.strptime(debt_data.due_date, '%Y-%m-%d').replace(tzinfo=timezone.utc)
        else:
            due_date_str = debt["due_date"]
            due_date_obj = datetime.strptime(debt["due_date"], '%Y-%m-%d').replace(tzinfo=timezone.utc)
    except:
        # إذا فشل، استخدم التاريخ الحالي من DB
        due_date_str = debt["due_date"]
        due_date_obj = datetime.now(timezone.utc) + timedelta(days=30)
    
    now = datetime.now(timezone.utc)
    
    if remaining <= 0:
        status = "paid"
    elif now > due_date_obj:
        status = "overdue"
    else:
        status = "active"
    
    await db.debts.update_one(
        {"id": debt_id},
        {"$set": {
            "customer_name": debt_data.customer_name,
            "customer_phone": debt_data.customer_phone,
            "product_description": debt_data.product_description,
            "total_amount": debt_data.total_amount,
            "paid_amount": debt_data.paid_amount,
            "remaining_amount": remaining,
            "status": status,
            "due_date": due_date_str,
            "customer_telegram_id": debt_data.customer_telegram_id
        }}
    )
    
    return {"message": "تم تحديث الدين بنجاح"}

@api_router.delete("/debts/{debt_id}")
async def delete_debt(debt_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["system"] != "debts":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص للديون فقط")
    
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    await db.debts.delete_one({"id": debt_id})
    return {"message": "تم حذف الدين بنجاح"}

@api_router.get("/debts/stats")
async def get_debts_stats(current_user: dict = Depends(get_current_user)):
    if current_user["system"] != "debts":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص للديون فقط")
    
    all_debts = await db.debts.find({}, {"_id": 0}).to_list(10000)
    
    total_debts = len(all_debts)
    active_debts = len([d for d in all_debts if d["status"] == "active"])
    overdue_debts = len([d for d in all_debts if d["status"] == "overdue"])
    paid_debts = len([d for d in all_debts if d["status"] == "paid"])
    
    total_amount = sum(d["total_amount"] for d in all_debts)
    total_paid = sum(d["paid_amount"] for d in all_debts)
    total_remaining = sum(d["remaining_amount"] for d in all_debts)
    
    return {
        "total_debts": total_debts,
        "active_debts": active_debts,
        "overdue_debts": overdue_debts,
        "paid_debts": paid_debts,
        "total_amount": total_amount,
        "total_paid": total_paid,
        "total_remaining": total_remaining
    }

# ============== PHONE REPAIRS SYSTEM (نظام صيانة الهواتف) ==============

@api_router.post("/repairs")
async def create_repair(repair_data: PhoneRepairCreate, current_user: dict = Depends(get_current_user)):
    if current_user["system"] != "phones":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص لصيانة الهواتف فقط")
    
    remaining = repair_data.repair_cost - repair_data.paid_amount
    
    # تحديد الحالة
    if remaining <= 0:
        status = "paid"
    else:
        status = "pending"
    
    repair_id = str(uuid.uuid4())
    repair_doc = {
        "id": repair_id,
        "customer_name": repair_data.customer_name,
        "customer_phone": repair_data.customer_phone,
        "phone_model": repair_data.phone_model,
        "issue_description": repair_data.issue_description,
        "repair_cost": repair_data.repair_cost,
        "parts_used": repair_data.parts_used,
        "paid_amount": repair_data.paid_amount,
        "remaining_amount": remaining,
        "status": status,
        "due_date": repair_data.due_date,
        "customer_telegram_id": repair_data.customer_telegram_id,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None
    }
    
    await db.repairs.insert_one(repair_doc)
    
    # إذا كان هناك دين متبقي، إضافته لديون الصيانة
    if remaining > 0:
        debt_doc = {
            "id": str(uuid.uuid4()),
            "customer_name": repair_data.customer_name,
            "customer_phone": repair_data.customer_phone,
            "phone_model": repair_data.phone_model,
            "issue_description": repair_data.issue_description,
            "total_amount": repair_data.repair_cost,
            "paid_amount": repair_data.paid_amount,
            "remaining_amount": remaining,
            "status": "active",
            "repair_id": repair_id,
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "due_date": repair_data.due_date or (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        }
        await db.repair_debts.insert_one(debt_doc)
    
    # إرسال إشعار للمدير
    admins = await db.users.find({"system": "phones", "role": "admin"}).to_list(100)
    for admin in admins:
        if admin.get("telegram_chat_id"):
            message = f"""
🔧 <b>تم إضافة صيانة جديدة</b>

👤 <b>الزبون:</b> {repair_data.customer_name}
📞 <b>الهاتف:</b> {repair_data.customer_phone}
📱 <b>الموديل:</b> {repair_data.phone_model}
🛠 <b>العطل:</b> {repair_data.issue_description}

💰 <b>التكلفة الكلية:</b> {repair_data.repair_cost:,.0f} دينار
✅ <b>المبلغ المدفوع:</b> {repair_data.paid_amount:,.0f} دينار
⚠️ <b>المبلغ المتبقي:</b> {remaining:,.0f} دينار

📅 <b>تاريخ التسليم:</b> {repair_data.due_date or 'غير محدد'}
            """
            await send_telegram_message(admin["telegram_chat_id"], message)
    
    # ملاحظة: القطع المستخدمة في الصيانة لا تُحفظ في مخزن قطع الغيار
    # مخزن قطع الغيار فقط للقطع المضافة يدوياً من المدير
    
    return {"message": "تم إضافة الصيانة بنجاح", "id": repair_id}

@api_router.get("/repairs")
async def get_repairs(
    search: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user["system"] != "phones":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص لصيانة الهواتف فقط")
    
    query = {}
    if search:
        query["$or"] = [
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"customer_phone": {"$regex": search, "$options": "i"}},
            {"phone_model": {"$regex": search, "$options": "i"}}
        ]
    if status:
        query["status"] = status
    
    repairs = await db.repairs.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return repairs

@api_router.get("/repairs/stats")
async def get_repairs_stats(
    period: str = "monthly",
    current_user: dict = Depends(get_current_user)
):
    if current_user["system"] != "phones":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص لصيانة الهواتف فقط")
    
    now = datetime.now(timezone.utc)
    
    if period == "weekly":
        start_date = now - timedelta(days=7)
    else:  # monthly
        start_date = now - timedelta(days=30)
    
    repairs = await db.repairs.find({
        "created_at": {"$gte": start_date.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    total_repairs = len(repairs)
    total_revenue = sum(r["repair_cost"] for r in repairs)
    total_paid = sum(r["paid_amount"] for r in repairs)
    total_remaining = sum(r["remaining_amount"] for r in repairs)
    
    # حساب الربح (تكلفة الإصلاح - تكلفة القطع)
    total_parts_cost = sum(
        sum(p.get("cost", 0) for p in r["parts_used"])
        for r in repairs
    )
    total_profit = total_revenue - total_parts_cost
    
    return {
        "period": period,
        "total_repairs": total_repairs,
        "total_revenue": total_revenue,
        "total_paid": total_paid,
        "total_remaining": total_remaining,
        "total_profit": total_profit,
        "total_parts_cost": total_parts_cost
    }

@api_router.put("/repairs/{repair_id}")
async def update_repair(repair_id: str, repair_data: PhoneRepairCreate, current_user: dict = Depends(get_current_user)):
    """تحديث بيانات الصيانة"""
    if current_user["system"] != "phones":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص لصيانة الهواتف فقط")
    
    repair = await db.repairs.find_one({"id": repair_id})
    if not repair:
        raise HTTPException(status_code=404, detail="الصيانة غير موجودة")
    
    remaining = repair_data.repair_cost - repair_data.paid_amount
    
    # تحديد الحالة
    if remaining <= 0:
        status = "paid"
    else:
        status = repair.get("status", "pending")
    
    await db.repairs.update_one(
        {"id": repair_id},
        {"$set": {
            "customer_name": repair_data.customer_name,
            "customer_phone": repair_data.customer_phone,
            "phone_model": repair_data.phone_model,
            "issue_description": repair_data.issue_description,
            "repair_cost": repair_data.repair_cost,
            "parts_used": repair_data.parts_used,
            "paid_amount": repair_data.paid_amount,
            "remaining_amount": remaining,
            "status": status,
            "due_date": repair_data.due_date,
            "customer_telegram_id": repair_data.customer_telegram_id
        }}
    )
    
    return {"message": "تم تحديث الصيانة بنجاح"}

@api_router.delete("/repairs/{repair_id}")
async def delete_repair(repair_id: str, current_user: dict = Depends(get_current_user)):
    """حذف صيانة"""
    if current_user["system"] != "phones":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص لصيانة الهواتف فقط")
    
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    await db.repairs.delete_one({"id": repair_id})

# ============== REPAIR DEBTS SYSTEM (ديون الصيانة) ==============

@api_router.post("/repair-debts")
async def create_repair_debt(debt_data: PhoneRepairCreate, current_user: dict = Depends(get_current_user)):
    """إضافة دين صيانة"""
    if current_user["system"] != "phones":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص لصيانة الهواتف فقط")
    
    remaining = debt_data.repair_cost - debt_data.paid_amount
    
    debt_id = str(uuid.uuid4())
    debt_doc = {
        "id": debt_id,
        "customer_name": debt_data.customer_name,
        "customer_phone": debt_data.customer_phone,
        "phone_model": debt_data.phone_model,
        "issue_description": debt_data.issue_description,
        "repair_cost": debt_data.repair_cost,
        "parts_used": debt_data.parts_used,
        "paid_amount": debt_data.paid_amount,
        "remaining_amount": remaining,
        "status": "debt",
        "due_date": debt_data.due_date,
        "customer_telegram_id": debt_data.customer_telegram_id,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.repair_debts.insert_one(debt_doc)
    
    # إرسال إشعار للمدير
    admins = await db.users.find({"system": "phones", "role": "admin"}).to_list(100)
    for admin in admins:
        if admin.get("telegram_chat_id"):
            message = f"""
💳 <b>تم إضافة دين صيانة جديد</b>

👤 <b>الزبون:</b> {debt_data.customer_name}
📞 <b>الهاتف:</b> {debt_data.customer_phone}
📱 <b>الموديل:</b> {debt_data.phone_model}
🛠 <b>العطل:</b> {debt_data.issue_description}

💰 <b>التكلفة الكلية:</b> {debt_data.repair_cost:,.0f} دينار
✅ <b>المبلغ المدفوع:</b> {debt_data.paid_amount:,.0f} دينار
⚠️ <b>المبلغ المتبقي:</b> {remaining:,.0f} دينار

📅 <b>تاريخ الاستحقاق:</b> {debt_data.due_date or 'غير محدد'}
            """
            await send_telegram_message(admin["telegram_chat_id"], message)
    
    return {"message": "تم إضافة دين الصيانة بنجاح", "id": debt_id}

@api_router.get("/repair-debts")
async def get_repair_debts(current_user: dict = Depends(get_current_user)):
    """الحصول على جميع ديون الصيانة"""
    if current_user["system"] != "phones":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص لصيانة الهواتف فقط")
    
    debts = await db.repair_debts.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return debts

@api_router.put("/repair-debts/{debt_id}")
async def update_repair_debt(debt_id: str, debt_data: PhoneRepairCreate, current_user: dict = Depends(get_current_user)):
    """تحديث دين صيانة"""
    if current_user["system"] != "phones":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص لصيانة الهواتف فقط")
    
    remaining = debt_data.repair_cost - debt_data.paid_amount
    
    await db.repair_debts.update_one(
        {"id": debt_id},
        {"$set": {
            "customer_name": debt_data.customer_name,
            "customer_phone": debt_data.customer_phone,
            "phone_model": debt_data.phone_model,
            "issue_description": debt_data.issue_description,
            "repair_cost": debt_data.repair_cost,
            "parts_used": debt_data.parts_used,
            "paid_amount": debt_data.paid_amount,
            "remaining_amount": remaining,
            "due_date": debt_data.due_date,
            "customer_telegram_id": debt_data.customer_telegram_id
        }}
    )
    
    return {"message": "تم تحديث دين الصيانة بنجاح"}

@api_router.delete("/repair-debts/{debt_id}")
async def delete_repair_debt(debt_id: str, current_user: dict = Depends(get_current_user)):
    """حذف دين صيانة"""
    if current_user["system"] != "phones":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص لصيانة الهواتف فقط")
    
    await db.repair_debts.delete_one({"id": debt_id})
    return {"message": "تم حذف دين الصيانة بنجاح"}

@api_router.get("/repair-debts/stats")
async def get_repair_debts_stats(current_user: dict = Depends(get_current_user)):
    """إحصائيات ديون الصيانة"""
    if current_user["system"] != "phones":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص لصيانة الهواتف فقط")
    
    debts = await db.repair_debts.find({}).to_list(length=10000)
    
    total_debts = len(debts)
    # استخدام .get() لتجنب KeyError إذا كان الحقل غير موجود
    total_amount = sum(d.get("total_amount", d.get("repair_cost", 0)) for d in debts)
    total_paid = sum(d.get("paid_amount", 0) for d in debts)
    total_remaining = sum(d.get("remaining_amount", 0) for d in debts)
    
    return {
        "total_debts": total_debts,
        "total_amount": total_amount,
        "total_paid": total_paid,
        "total_remaining": total_remaining
    }

@api_router.put("/parts/{part_id}")
async def update_part(part_id: str, phone_model: str, part_name: str, cost: float, quantity: int, current_user: dict = Depends(get_current_user)):
    """تحديث قطعة غيار"""
    if current_user["system"] != "phones":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص لصيانة الهواتف فقط")
    
    await db.parts.update_one(
        {"id": part_id},
        {"$set": {
            "phone_model": phone_model,
            "part_name": part_name,
            "cost": cost,
            "quantity": quantity
        }}
    )
    
    return {"message": "تم تحديث قطعة الغيار بنجاح"}

@api_router.delete("/parts/{part_id}")
async def delete_part(part_id: str, current_user: dict = Depends(get_current_user)):
    """حذف قطعة غيار"""
    if current_user["system"] != "phones":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص لصيانة الهواتف فقط")
    
    await db.parts.delete_one({"id": part_id})
    return {"message": "تم حذف قطعة الغيار بنجاح"}

# نظام إدارة الموظفين - baqerr
@api_router.get("/phones/employees")
async def get_phones_employees(current_user: dict = Depends(get_current_user)):
    """جلب موظفي نظام الصيانة"""
    if current_user["system"] != "phones" or current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    employees = await db.users.find(
        {"system": "phones"},
        {"_id": 0, "password": 0}
    ).to_list(1000)
    
    return employees

@api_router.post("/phones/employees")
async def create_phones_employee(user_data: dict, current_user: dict = Depends(get_current_user)):
    """إنشاء موظف جديد في نظام الصيانة"""
    if current_user["system"] != "phones" or current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    # التحقق من عدم وجود المستخدم
    existing = await db.users.find_one({"username": user_data["username"]})
    if existing:
        raise HTTPException(status_code=400, detail="اسم المستخدم موجود بالفعل")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "username": user_data["username"],
        "password": user_data["password"],
        "name": user_data["name"],
        "role": user_data.get("role", "employee"),
        "system": "phones",
        "permissions": user_data.get("permissions", []),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    return {"message": "تم إنشاء الموظف بنجاح", "id": user_id}

@api_router.put("/phones/employees/{user_id}")
async def update_phones_employee(
    user_id: str,
    user_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """تحديث موظف في نظام الصيانة"""
    if current_user["system"] != "phones" or current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    update_data = {
        "name": user_data["name"],
        "permissions": user_data.get("permissions", [])
    }
    
    if user_data.get("password"):
        update_data["password"] = user_data["password"]
    
    await db.users.update_one(
        {"id": user_id, "system": "phones"},
        {"$set": update_data}
    )
    
    return {"message": "تم تحديث الموظف بنجاح"}

@api_router.delete("/phones/employees/{user_id}")
async def delete_phones_employee(user_id: str, current_user: dict = Depends(get_current_user)):
    """حذف موظف من نظام الصيانة"""
    if current_user["system"] != "phones" or current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    await db.users.delete_one({"id": user_id, "system": "phones"})
    
    return {"message": "تم حذف الموظف بنجاح"}



@api_router.post("/parts")
async def add_part(
    phone_model: str,
    part_name: str,
    cost: float,
    quantity: int,
    current_user: dict = Depends(get_current_user)
):
    """إضافة قطعة غيار جديدة"""
    if current_user["system"] != "phones":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص لصيانة الهواتف فقط")
    
    part_id = str(uuid.uuid4())
    part_doc = {
        "id": part_id,
        "phone_model": phone_model,
        "part_name": part_name,
        "cost": cost,
        "quantity": quantity,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.parts.insert_one(part_doc)
    return {"message": "تم إضافة قطعة الغيار بنجاح", "id": part_id}

@api_router.get("/parts", response_model=List[PhonePart])
async def get_parts(
    phone_model: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user["system"] != "phones":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص لصيانة الهواتف فقط")
    
    query = {}
    if phone_model:
        query["phone_model"] = {"$regex": phone_model, "$options": "i"}
    
    parts = await db.parts.find(query, {"_id": 0}).sort("phone_model", 1).to_list(1000)
    return parts

# ============== WORK SESSIONS (نظام تسجيل الدخول/الخروج) ==============

@api_router.post("/work-session/clock-in")
async def clock_in(current_user: dict = Depends(get_current_user)):
    """تسجيل دخول الموظف"""
    # Check if there's an active session
    active_session = await db.work_sessions.find_one({
        "employee_id": current_user["id"],
        "status": "active"
    })
    
    if active_session:
        raise HTTPException(status_code=400, detail="لديك جلسة عمل نشطة بالفعل")
    
    # Get employee schedule
    schedule = await db.employee_schedules.find_one({"employee_id": current_user["id"]})
    planned_hours = schedule["daily_hours"] if schedule else 8.0
    
    session_id = str(uuid.uuid4())
    session_doc = {
        "id": session_id,
        "employee_id": current_user["id"],
        "employee_name": current_user["name"],
        "system": current_user["system"],
        "clock_in": datetime.now(timezone.utc).isoformat(),
        "clock_out": None,
        "planned_hours": planned_hours,
        "actual_hours": None,
        "status": "active",
        "notes": None
    }
    
    await db.work_sessions.insert_one(session_doc)
    
    # إرسال إشعار للمدير عند تسجيل الدخول
    admins = await db.users.find({"system": current_user["system"], "role": "admin"}).to_list(100)
    for admin in admins:
        # إرسال للمدير الرئيسي
        if admin.get("telegram_chat_id"):
            message = f"""
✅ <b>تسجيل دخول موظف</b>

👤 <b>الموظف:</b> {current_user['name']}
🕐 <b>وقت الدخول:</b> {datetime.now().strftime('%Y-%m-%d %H:%M')}
⏰ <b>الساعات المخططة:</b> {planned_hours:.1f} ساعة
            """
            await send_telegram_message(admin["telegram_chat_id"], message)
        
        # إرسال للمدير المفوض (يستقبل كل شيء)
        if admin.get("delegated_admin_telegram_id"):
            await send_telegram_message(admin["delegated_admin_telegram_id"], message)
    
    return {"message": "تم تسجيل الدخول بنجاح", "session_id": session_id, "planned_hours": planned_hours}

@api_router.post("/work-session/clock-out")
async def clock_out(current_user: dict = Depends(get_current_user)):
    """تسجيل خروج الموظف"""
    session = await db.work_sessions.find_one({
        "employee_id": current_user["id"],
        "status": "active"
    })
    
    if not session:
        raise HTTPException(status_code=400, detail="لا توجد جلسة عمل نشطة")
    
    now = datetime.now(timezone.utc)
    clock_in = datetime.fromisoformat(session["clock_in"])
    actual_hours = (now - clock_in).total_seconds() / 3600
    
    # Determine if late
    status = "completed"
    if actual_hours < session["planned_hours"]:
        status = "late"
    
    await db.work_sessions.update_one(
        {"id": session["id"]},
        {
            "$set": {
                "clock_out": now.isoformat(),
                "actual_hours": actual_hours,
                "status": status
            }
        }
    )
    
    # إرسال إشعار للمدير عند تسجيل الخروج
    admins = await db.users.find({"system": current_user["system"], "role": "admin"}).to_list(100)
    
    for admin in admins:
        if admin.get("telegram_chat_id"):
            if status == "late":
                hours_diff = session["planned_hours"] - actual_hours
                message = f"""
⚠️ <b>تنبيه: موظف غادر مبكراً</b>

👤 <b>الموظف:</b> {current_user['name']}
⏰ <b>الساعات المخططة:</b> {session['planned_hours']:.1f} ساعة
⏱ <b>الساعات الفعلية:</b> {actual_hours:.1f} ساعة
📉 <b>النقص:</b> {hours_diff:.1f} ساعة
                """
            else:
                message = f"""
✅ <b>تسجيل خروج موظف</b>

👤 <b>الموظف:</b> {current_user['name']}
🕐 <b>وقت الخروج:</b> {datetime.now().strftime('%Y-%m-%d %H:%M')}
⏰ <b>الساعات المخططة:</b> {session['planned_hours']:.1f} ساعة
⏱ <b>الساعات الفعلية:</b> {actual_hours:.1f} ساعة
✅ <b>الحالة:</b> مكتمل
                """
            await send_telegram_message(admin["telegram_chat_id"], message)
        
        # إرسال للمدير المفوض (يستقبل كل شيء)
        if admin.get("delegated_admin_telegram_id"):
            await send_telegram_message(admin["delegated_admin_telegram_id"], message)
    
    # Notify employee
    if current_user.get("telegram_chat_id"):
        message = f"""
✅ <b>تم تسجيل خروجك</b>

⏰ <b>ساعات العمل:</b> {actual_hours:.1f} ساعة
📊 <b>الحالة:</b> {'مكتمل' if status == 'completed' else 'مبكر'}
        """
        await send_telegram_message(current_user["telegram_chat_id"], message)
    
    return {
        "message": "تم تسجيل الخروج بنجاح",
        "actual_hours": actual_hours,
        "status": status
    }

@api_router.get("/work-session/active")
async def get_active_session(current_user: dict = Depends(get_current_user)):
    """الحصول على جلسة العمل النشطة"""
    session = await db.work_sessions.find_one({
        "employee_id": current_user["id"],
        "status": "active"
    }, {"_id": 0})
    
    if not session:
        return None
    
    # Calculate elapsed time
    clock_in = datetime.fromisoformat(session["clock_in"])
    elapsed_seconds = (datetime.now(timezone.utc) - clock_in).total_seconds()
    
    return {
        **session,
        "elapsed_seconds": elapsed_seconds
    }

@api_router.get("/work-sessions/employee/{employee_id}")
async def get_employee_sessions(employee_id: str, current_user: dict = Depends(get_current_user)):
    """جلب سجل حضور موظف"""
    if current_user["role"] != "admin" and current_user["id"] != employee_id:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    sessions = await db.work_sessions.find(
        {"employee_id": employee_id},
        {"_id": 0}
    ).sort("clock_in", -1).to_list(1000)
    
    return sessions

@api_router.post("/employee-schedule")
async def set_employee_schedule(schedule: EmployeeSchedule, current_user: dict = Depends(get_current_user)):
    """تحديد وقت عمل الموظف (للمدير فقط)"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    await db.employee_schedules.update_one(
        {"employee_id": schedule.employee_id},
        {"$set": {
            "employee_id": schedule.employee_id,
            "daily_hours": schedule.daily_hours,
            "start_time": schedule.start_time,
            "end_time": schedule.end_time
        }},
        upsert=True
    )
    
    return {"message": "تم تحديد وقت العمل بنجاح"}

@api_router.get("/employee-schedule/{employee_id}")
async def get_employee_schedule(employee_id: str, current_user: dict = Depends(get_current_user)):
    """جلب وقت عمل الموظف"""
    schedule = await db.employee_schedules.find_one({"employee_id": employee_id}, {"_id": 0})
    return schedule

@api_router.post("/salary-adjustment")
async def create_salary_adjustment(
    employee_id: str,
    amount: float,
    reason: str,
    current_user: dict = Depends(get_current_user)
):
    """خصم أو إضافة على راتب الموظف"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    employee = await db.users.find_one({"id": employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")
    
    adjustment_id = str(uuid.uuid4())
    adjustment_doc = {
        "id": adjustment_id,
        "employee_id": employee_id,
        "employee_name": employee["name"],
        "amount": amount,
        "reason": reason,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.salary_adjustments.insert_one(adjustment_doc)
    
    # Notify employee
    if employee.get("telegram_chat_id"):
        adjustment_type = "إضافة" if amount > 0 else "خصم"
        message = f"""
{'💰' if amount > 0 else '⚠️'} <b>{adjustment_type} على الراتب</b>

💵 <b>المبلغ:</b> {abs(amount):,.0f} دينار
📝 <b>السبب:</b> {reason}
📅 <b>التاريخ:</b> {datetime.now().strftime('%Y-%m-%d')}
        """
        await send_telegram_message(employee["telegram_chat_id"], message)
    
    return {"message": f"تم {adjustment_type} بنجاح"}

@api_router.get("/salary-adjustments/{employee_id}")
async def get_salary_adjustments(employee_id: str, current_user: dict = Depends(get_current_user)):
    """جلب تعديلات راتب الموظف"""
    if current_user["role"] != "admin" and current_user["id"] != employee_id:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    adjustments = await db.salary_adjustments.find(
        {"employee_id": employee_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return adjustments

@api_router.post("/broadcast-message")
async def broadcast_message(message: dict, current_user: dict = Depends(get_current_user)):
    """إرسال رسالة جماعية لجميع الموظفين"""
    if current_user["system"] != "tasks" or current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    # جلب جميع الموظفين
    employees = await db.users.find(
        {"system": "tasks", "role": "technician"},
        {"_id": 0}
    ).to_list(1000)
    
    sent_count = 0
    failed_count = 0
    
    for employee in employees:
        if employee.get("telegram_chat_id"):
            try:
                formatted_message = f"""
📢 <b>رسالة من المدير</b>

{message.get('text', '')}

<i>تم الإرسال من: {current_user['name']}</i>
                """
                await send_telegram_message(employee["telegram_chat_id"], formatted_message)
                sent_count += 1
            except:
                failed_count += 1
    
    return {
        "message": f"تم إرسال الرسالة بنجاح",
        "sent": sent_count,
        "failed": failed_count
    }

@api_router.get("/locations/{task_id}")
async def get_task_location(task_id: str, current_user: dict = Depends(get_current_user)):
    """جلب موقع المهمة (موقع الموظف المكلف بالمهمة)"""
    if current_user["system"] != "tasks":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص للمهام فقط")
    
    # جلب المهمة للحصول على معرف الموظف
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="المهمة غير موجودة")
    
    employee_id = task.get("assigned_to")
    if not employee_id:
        return []
    
    # جلب آخر موقع مسجل للموظف
    location = await db.locations.find_one(
        {"employee_id": employee_id},
        {"_id": 0},
        sort=[("timestamp", -1)]
    )
    
    if location:
        # إضافة معلومات العميل من المهمة
        location["customer_name"] = task.get("customer_name", "")
        location["customer_address"] = task.get("customer_address", "")
        return [location]
    
    # إرجاع موقع العميل كموقع افتراضي
    return [{
        "employee_id": employee_id,
        "latitude": 33.3152,  # بغداد - موقع افتراضي
        "longitude": 44.3661,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "customer_name": task.get("customer_name", ""),
        "customer_address": task.get("customer_address", ""),
        "note": "في انتظار تحديث الموقع من الموظف"
    }]

@api_router.get("/employee-location/{employee_id}")
async def get_employee_location(employee_id: str, current_user: dict = Depends(get_current_user)):
    """جلب موقع الموظف"""
    if current_user["system"] != "tasks" or current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    # جلب آخر موقع مسجل للموظف
    location = await db.locations.find_one(
        {"employee_id": employee_id},
        {"_id": 0},
        sort=[("timestamp", -1)]
    )
    
    if not location:
        # إرجاع موقع افتراضي إذا لم يكن هناك موقع مسجل
        return {
            "employee_id": employee_id,
            "latitude": 33.3152,  # بغداد
            "longitude": 44.3661,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "note": "لم يتم تسجيل موقع بعد",
            "accuracy": 0
        }
    
    return location

@api_router.post("/employee-location")
async def save_employee_location(
    location_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """حفظ موقع الموظف الحالي"""
    if current_user["system"] != "tasks":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص للمهام فقط")
    
    location_doc = {
        "employee_id": current_user["id"],
        "latitude": location_data.get("latitude"),
        "longitude": location_data.get("longitude"),
        "accuracy": location_data.get("accuracy", 0),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.locations.insert_one(location_doc)
    
    return {"message": "تم حفظ الموقع بنجاح"}

# ============== AGENTS ACCOUNTING SYSTEM (نظام محاسبة الوكلاء) ==============

class AgentCreate(BaseModel):
    name: str
    phone: str
    mastercard_number: str
    total_subscribers: int = 0
    disconnected_count: int = 0

class Agent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    phone: str
    mastercard_number: str
    total_subscribers: int
    disconnected_count: int
    active_subscribers: int
    monthly_payment: float
    created_by: str
    created_at: str
    payments_history: List[dict]

@api_router.post("/agents")
async def create_agent(agent_data: AgentCreate, current_user: dict = Depends(get_current_user)):
    """إضافة وكيل جديد"""
    if current_user["system"] != "agents":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص لمحاسبة الوكلاء فقط")
    
    # حساب تلقائي
    active_subscribers = agent_data.total_subscribers - agent_data.disconnected_count
    monthly_payment = active_subscribers * 5000  # 5000 دينار لكل مشترك
    
    agent_id = str(uuid.uuid4())
    agent_doc = {
        "id": agent_id,
        "name": agent_data.name,
        "phone": agent_data.phone,
        "mastercard_number": agent_data.mastercard_number,
        "total_subscribers": agent_data.total_subscribers,
        "disconnected_count": agent_data.disconnected_count,
        "active_subscribers": active_subscribers,
        "monthly_payment": monthly_payment,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "payments_history": []
    }
    
    await db.agents.insert_one(agent_doc)
    
    # إشعار للمدير
    if current_user.get("telegram_chat_id"):
        message = f"""
✅ <b>تم إضافة وكيل جديد</b>

👤 <b>الوكيل:</b> {agent_data.name}
📞 <b>الهاتف:</b> {agent_data.phone}
💳 <b>الماستر كارد:</b> {agent_data.mastercard_number}

👥 <b>عدد المشتركين:</b> {agent_data.total_subscribers}
⚠️ <b>غير متصلين:</b> {agent_data.disconnected_count}
✅ <b>النشطين:</b> {active_subscribers}

💰 <b>المستحق الشهري:</b> {monthly_payment:,.0f} دينار عراقي
        """
        await send_telegram_message(current_user["telegram_chat_id"], message)
    
    return {"message": "تم إضافة الوكيل بنجاح", "id": agent_id}

@api_router.get("/agents")
async def get_agents(current_user: dict = Depends(get_current_user)):
    """جلب جميع الوكلاء"""
    if current_user["system"] != "agents":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص لمحاسبة الوكلاء فقط")
    
    agents = await db.agents.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return agents

@api_router.put("/agents/{agent_id}")
async def update_agent(agent_id: str, agent_data: AgentCreate, current_user: dict = Depends(get_current_user)):
    """تحديث بيانات وكيل"""
    if current_user["system"] != "agents":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص لمحاسبة الوكلاء فقط")
    
    # حساب تلقائي
    active_subscribers = agent_data.total_subscribers - agent_data.disconnected_count
    monthly_payment = active_subscribers * 5000
    
    await db.agents.update_one(
        {"id": agent_id},
        {"$set": {
            "name": agent_data.name,
            "phone": agent_data.phone,
            "mastercard_number": agent_data.mastercard_number,
            "total_subscribers": agent_data.total_subscribers,
            "disconnected_count": agent_data.disconnected_count,
            "active_subscribers": active_subscribers,
            "monthly_payment": monthly_payment
        }}
    )
    
    return {"message": "تم تحديث بيانات الوكيل بنجاح"}

@api_router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str, current_user: dict = Depends(get_current_user)):
    """حذف وكيل"""
    if current_user["system"] != "agents":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص لمحاسبة الوكلاء فقط")
    
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    await db.agents.delete_one({"id": agent_id})
    return {"message": "تم حذف الوكيل بنجاح"}

@api_router.post("/agents/{agent_id}/payment")
async def record_payment(agent_id: str, current_user: dict = Depends(get_current_user)):
    """تسجيل دفعة للوكيل وإرسال رسالة واتساب"""
    if current_user["system"] != "agents":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص لمحاسبة الوكلاء فقط")
    
    agent = await db.agents.find_one({"id": agent_id})
    if not agent:
        raise HTTPException(status_code=404, detail="الوكيل غير موجود")
    
    payment_record = {
        "amount": agent["monthly_payment"],
        "date": datetime.now(timezone.utc).isoformat(),
        "active_subscribers": agent["active_subscribers"],
        "by": current_user["name"]
    }
    
    await db.agents.update_one(
        {"id": agent_id},
        {"$push": {"payments_history": payment_record}}
    )
    
    return {
        "message": "تم تسجيل الدفعة بنجاح",
        "amount": agent["monthly_payment"],
        "phone": agent["phone"]
    }

@api_router.get("/agents/stats")
async def get_agents_stats(current_user: dict = Depends(get_current_user)):
    """إحصائيات الوكلاء"""
    if current_user["system"] != "agents":
        raise HTTPException(status_code=403, detail="هذا النظام مخصص لمحاسبة الوكلاء فقط")
    
    agents = await db.agents.find({}, {"_id": 0}).to_list(10000)
    
    total_agents = len(agents)
    total_subscribers = sum(a["total_subscribers"] for a in agents)
    total_active = sum(a["active_subscribers"] for a in agents)
    total_disconnected = sum(a["disconnected_count"] for a in agents)
    total_monthly_payment = sum(a["monthly_payment"] for a in agents)
    
    return {
        "total_agents": total_agents,
        "total_subscribers": total_subscribers,
        "total_active": total_active,
        "total_disconnected": total_disconnected,
        "total_monthly_payment": total_monthly_payment
    }

# نظام المستخدمين في الوكلاء
@api_router.get("/agents/users")
async def get_agents_users(current_user: dict = Depends(get_current_user)):
    """جلب مستخدمي نظام الوكلاء"""
    if current_user["system"] != "agents" or current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    users = await db.users.find(
        {"system": "agents"},
        {"_id": 0, "password": 0}
    ).to_list(1000)
    
    return users

@api_router.post("/agents/users")
async def create_agents_user(user_data: dict, current_user: dict = Depends(get_current_user)):
    """إنشاء مستخدم جديد في نظام الوكلاء"""
    if current_user["system"] != "agents" or current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    # التحقق من عدم وجود المستخدم
    existing = await db.users.find_one({"username": user_data["username"]})
    if existing:
        raise HTTPException(status_code=400, detail="اسم المستخدم موجود بالفعل")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "username": user_data["username"],
        "password": user_data["password"],
        "name": user_data["name"],
        "role": user_data.get("role", "user"),
        "system": "agents",
        "permissions": user_data.get("permissions", []),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    return {"message": "تم إنشاء المستخدم بنجاح", "id": user_id}

@api_router.put("/agents/users/{user_id}")
async def update_agents_user(
    user_id: str,
    user_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """تحديث مستخدم في نظام الوكلاء"""
    if current_user["system"] != "agents" or current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    update_data = {
        "name": user_data["name"],
        "permissions": user_data.get("permissions", [])
    }
    
    if user_data.get("password"):
        update_data["password"] = user_data["password"]
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    return {"message": "تم تحديث المستخدم بنجاح"}

@api_router.delete("/agents/users/{user_id}")
async def delete_agents_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """حذف مستخدم من نظام الوكلاء"""
    if current_user["system"] != "agents" or current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="الصلاحية للمدير فقط")
    
    await db.users.delete_one({"id": user_id, "system": "agents"})
    
    return {"message": "تم حذف المستخدم بنجاح"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()