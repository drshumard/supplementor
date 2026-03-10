#!/usr/bin/env python3
"""
Import templates and supplements into production MongoDB.

Usage:
  python3 import_data.py [--mongo-url mongodb://localhost:27017/drshumard_protocol]

Place templates_export.json and supplements_export.json in the same directory.
"""
import asyncio
import json
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

MONGO_URL = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("MONGO_URL", "mongodb://localhost:27017/drshumard_protocol")

async def import_data():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.get_default_database()
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Import supplements
    supp_file = os.path.join(script_dir, "supplements_export.json")
    if os.path.exists(supp_file):
        with open(supp_file) as f:
            supplements = json.load(f)
        
        existing = await db.supplements.count_documents({})
        if existing > 0:
            print(f"⚠ Supplements collection has {existing} docs. Drop and reimport? (y/n)")
            if input().strip().lower() == 'y':
                await db.supplements.drop()
                print("  Dropped existing supplements.")
            else:
                print("  Skipping supplements.")
                supplements = []
        
        if supplements:
            for s in supplements:
                s.pop('_id', None)
                if 'created_at' not in s:
                    s['created_at'] = datetime.utcnow()
                if 'updated_at' not in s:
                    s['updated_at'] = datetime.utcnow()
            await db.supplements.insert_many(supplements)
            print(f"✓ Imported {len(supplements)} supplements")
    else:
        print(f"✗ {supp_file} not found")
    
    # Import templates
    tmpl_file = os.path.join(script_dir, "templates_export.json")
    if os.path.exists(tmpl_file):
        with open(tmpl_file) as f:
            templates = json.load(f)
        
        existing = await db.templates.count_documents({})
        if existing > 0:
            print(f"⚠ Templates collection has {existing} docs. Drop and reimport? (y/n)")
            if input().strip().lower() == 'y':
                await db.templates.drop()
                print("  Dropped existing templates.")
            else:
                print("  Skipping templates.")
                templates = []
        
        if templates:
            for t in templates:
                t.pop('_id', None)
                if 'created_at' not in t:
                    t['created_at'] = datetime.utcnow()
                if 'updated_at' not in t:
                    t['updated_at'] = datetime.utcnow()
            await db.templates.insert_many(templates)
            print(f"✓ Imported {len(templates)} templates")
    else:
        print(f"✗ {tmpl_file} not found")
    
    # Verify
    s_count = await db.supplements.count_documents({})
    t_count = await db.templates.count_documents({})
    print(f"\nDatabase now has: {s_count} supplements, {t_count} templates")

asyncio.run(import_data())
