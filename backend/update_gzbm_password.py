import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def update_password():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # تحديث كلمة مرور gzbm إلى 1010
    new_password_hash = pwd_context.hash("1010")
    
    result = await db.users.update_one(
        {"username": "gzbm"},
        {"$set": {"password": new_password_hash}}
    )
    
    if result.modified_count > 0:
        print("✓ تم تحديث كلمة مرور gzbm إلى 1010 بنجاح")
    else:
        print("⚠ لم يتم العثور على المستخدم gzbm أو كلمة المرور محدثة بالفعل")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(update_password())
