# 🔧 دليل حل المشاكل - Troubleshooting Guide

## مشاكل شائعة وحلولها

---

### 1. ❌ الموقع لا يفتح على GitHub Pages

**السبب:**
GitHub Pages يدعم فقط المواقع الثابتة (Static Sites) وليس تطبيقات Full-Stack.

**الحل:**
- استخدم منصة أخرى مثل Render.com أو Railway.app
- أو انشر Frontend على Netlify و Backend على Render

---

### 2. 🔴 خطأ "Failed to fetch" أو "Network Error"

**السبب:**
Frontend لا يستطيع الاتصال بـ Backend.

**الحل:**
1. تحقق من `REACT_APP_BACKEND_URL` في ملف `.env`:
   ```bash
   # يجب أن يكون:
   REACT_APP_BACKEND_URL=https://your-backend-url.com
   ```

2. تأكد أن Backend يعمل:
   ```bash
   curl https://your-backend-url.com/api/auth/login
   ```

3. تحقق من CORS في Backend (server.py):
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],  # أو حدد Frontend URL
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

---

### 3. 🔐 لا يمكن تسجيل الدخول

**السبب:**
مشكلة في الاتصال بقاعدة البيانات أو بيانات الدخول خاطئة.

**الحل:**
1. تحقق من MONGO_URL:
   ```bash
   # في backend/.env
   MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
   ```

2. استخدم الحسابات الافتراضية:
   - **نظام المهام:**
     * Username: `admin`
     * Password: `198212`
   
   - **نظام الديون:**
     * Username: `gzbm`
     * Password: `1010`
   
   - **نظام صيانة الهواتف:**
     * Username: `baqerr`
     * Password: `11223300`
   
   - **نظام محاسبة الوكلاء:**
     * Username: `uakel`
     * Password: `1111`

---

### 4. 💾 قاعدة البيانات لا تعمل

**السبب:**
MongoDB غير متصل أو MONGO_URL خاطئ.

**الحل:**

#### استخدام MongoDB Atlas (مجاني):
1. اذهب إلى: https://www.mongodb.com/cloud/atlas
2. أنشئ حساب مجاني
3. أنشئ Cluster جديد
4. اضغط "Connect" → "Connect your application"
5. انسخ Connection String
6. أضفه في `backend/.env`:
   ```
   MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
   ```

---

### 5. 📱 الموقع لا يعمل على الموبايل

**السبب:**
مشكلة في Responsive Design أو HTTPS.

**الحل:**
1. تأكد أن الموقع يستخدم HTTPS
2. تحقق من Viewport في HTML:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   ```

---

### 6. 🚫 خطأ "404 Not Found" على بعض الصفحات

**السبب:**
React Router يحتاج إعدادات خاصة على السيرفر.

**الحل:**

**على Netlify:**
أضف ملف `_redirects` في `frontend/public`:
```
/*    /index.html   200
```

**على Vercel:**
ملف `vercel.json` موجود بالفعل في مجلد `deployment`

---

### 7. ⚡ الموقع بطيء جداً

**السبب:**
Backend أو Database بطيء.

**الحل:**
1. استخدم CDN لـ Frontend
2. فعّل Caching في Backend
3. أضف Indexes في MongoDB:
   ```javascript
   db.users.createIndex({ username: 1 })
   db.tasks.createIndex({ created_at: -1 })
   ```

---

### 8. 🔔 إشعارات Telegram لا تعمل

**السبب:**
Telegram Bot Token غير صحيح أو Chat ID خاطئ.

**الحل:**
1. تأكد من Token في `server.py`:
   ```python
   TELEGRAM_BOT_TOKEN = "your-bot-token-here"
   ```

2. احصل على Chat ID الخاص بك:
   - أرسل رسالة للبوت
   - اذهب إلى: `https://api.telegram.org/botYOUR_TOKEN/getUpdates`
   - ابحث عن `chat.id`

---

### 9. 🎨 التصميم معطل أو CSS لا يعمل

**السبب:**
مسارات الملفات خاطئة أو Build غير صحيح.

**الحل:**
1. أعد Build Frontend:
   ```bash
   cd frontend
   rm -rf build node_modules
   yarn install
   yarn build
   ```

2. تحقق من المسارات في `package.json`:
   ```json
   "homepage": "."
   ```

---

### 10. 🔒 مشاكل أمنية (CORS, CSP)

**السبب:**
إعدادات الأمان تمنع الاتصال.

**الحل:**

**في Backend (server.py):**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-url.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**في Netlify (netlify.toml):**
ملف الإعدادات موجود بالفعل في `deployment/netlify.toml`

---

## 📊 فحص الأخطاء (Debugging)

### تحقق من Logs:

**Backend:**
```bash
# على Render
render logs -s your-service-name

# محلياً
tail -f /var/log/supervisor/backend.err.log
```

**Frontend:**
- افتح Developer Console في المتصفح (F12)
- تحقق من علامة Console
- ابحث عن أخطاء حمراء

---

## 🆘 لم تجد الحل؟

1. تحقق من Documentation الرسمي:
   - [Render.com Docs](https://render.com/docs)
   - [Netlify Docs](https://docs.netlify.com)
   - [MongoDB Atlas Docs](https://docs.atlas.mongodb.com)

2. راجع ملف `README.md` في مجلد `deployment`

3. تحقق من GitHub Issues في المشروع

---

**✅ تم إنشاء هذا الدليل بواسطة Emergent AI**
