import psycopg2
import os

from dotenv import load_dotenv
load_dotenv()

with open("db/init.sql", "r") as f:
    sql = f.read()

try:
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    conn.autocommit = True
    cursor = conn.cursor()
    cursor.execute(sql)
    print("Schema updated successfully.")
except Exception as e:
    print(f"Error: {e}")
