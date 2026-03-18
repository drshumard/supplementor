#!/usr/bin/env python3
"""
CLI tool to manage user roles.

Usage:
  python3 manage_users.py list
  python3 manage_users.py set-admin user@email.com
  python3 manage_users.py set-hc user@email.com
  python3 manage_users.py delete user@email.com
"""
import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "supplement_app")

# Also try loading from .env
try:
    with open(os.path.join(os.path.dirname(__file__), '.env')) as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                k, v = line.strip().split('=', 1)
                v = v.strip('"').strip("'")
                if k == 'MONGO_URL': MONGO_URL = v
                if k == 'DB_NAME': DB_NAME = v
except FileNotFoundError:
    pass


async def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    cmd = sys.argv[1]

    if cmd == "list":
        async for u in db.users.find({}, {"name":1, "email":1, "role":1, "clerk_user_id":1}):
            clerk = "linked" if u.get("clerk_user_id") else "not linked"
            print(f'  {u.get("email","?"):35s} {u.get("role","?"):6s} {u.get("name",""):20s} ({clerk})')

    elif cmd == "set-admin" and len(sys.argv) >= 3:
        email = sys.argv[2].lower()
        r = await db.users.update_one({"email": email}, {"$set": {"role": "admin"}})
        print(f"{'Done' if r.modified_count else 'User not found'}: {email} → admin")

    elif cmd == "set-hc" and len(sys.argv) >= 3:
        email = sys.argv[2].lower()
        r = await db.users.update_one({"email": email}, {"$set": {"role": "hc"}})
        print(f"{'Done' if r.modified_count else 'User not found'}: {email} → hc")

    elif cmd == "delete" and len(sys.argv) >= 3:
        email = sys.argv[2].lower()
        r = await db.users.delete_one({"email": email})
        print(f"{'Deleted' if r.deleted_count else 'Not found'}: {email}")

    else:
        print(__doc__)

asyncio.run(main())
