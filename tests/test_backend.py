import os
import sys
import time
import unittest
import subprocess
import requests
import psycopg2
from dotenv import load_dotenv

# Ensure we can load env
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(dotenv_path=os.path.join(BASE_DIR, ".env"))

NODE_URL = "http://localhost:3001"
FASTAPI_URL = "http://localhost:8000"
TEST_USER_ID = "227a0f49-8610-4ef6-b200-c10e4f6ccdd8"

class TestBackendIntegration(unittest.TestCase):
    node_proc = None
    fastapi_proc = None
    db_conn = None

    @classmethod
    def setUpClass(cls):
        print("\n=== [1/4] Connecting to Supabase PostgreSQL Database ===")
        db_url = os.getenv("DATABASE_URL")
        try:
            cls.db_conn = psycopg2.connect(db_url)
            cls.db_conn.autocommit = True
            print("Successfully connected to Supabase PostgreSQL!")
        except Exception as e:
            print(f"Error: Could not connect to database: {e}")
            raise unittest.SkipTest("Database connection failed, skipping integration tests.")

        print("\n=== [2/4] Starting Backend Servers in Background ===")
        node_dir = os.path.join(BASE_DIR, "backend-node")
        fastapi_dir = os.path.join(BASE_DIR, "backend-fastapi")

        # Start FastAPI
        print("Launching FastAPI RAG service (port 8000)...")
        # Copy current env and set system flags
        fastapi_env = dict(os.environ)
        cls.fastapi_proc = subprocess.Popen(
            ["python", "main.py"],
            cwd=fastapi_dir,
            env=fastapi_env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )

        # Start Node Gateway
        print("Launching Node.js API Gateway (port 3001)...")
        node_env = dict(os.environ)
        node_env["NODE_ENV"] = "test"
        cls.node_proc = subprocess.Popen(
            ["node", "server.js"],
            cwd=node_dir,
            env=node_env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )

        print("\n=== [3/4] Waiting for backend servers to become responsive ===")
        # Wait for Node Gateway (port 3001)
        node_ready = False
        for i in range(20):
            try:
                res = requests.get(f"{NODE_URL}/api/notebooks", headers={"x-test-bypass": "true"}, timeout=2)
                if res.status_code == 200:
                    node_ready = True
                    print(f"Node.js API Gateway is READY (took {i * 0.5:.1f}s)")
                    break
            except Exception:
                pass
            time.sleep(0.5)

        # Wait for FastAPI (port 8000)
        fastapi_ready = False
        for i in range(20):
            try:
                res = requests.get(f"{FASTAPI_URL}/docs", timeout=2)
                if res.status_code == 200:
                    fastapi_ready = True
                    print(f"FastAPI RAG Service is READY (took {i * 0.5:.1f}s)")
                    break
            except Exception:
                pass
            time.sleep(0.5)

        if not (node_ready and fastapi_ready):
            cls.tearDownClass()
            raise RuntimeError("Backend servers failed to start or become responsive in time.")
        
        print("\n=== [4/4] Starting Test Execution ===")

    @classmethod
    def tearDownClass(cls):
        print("\n=== Cleaning Up Test Database Records ===")
        if cls.db_conn:
            try:
                cur = cls.db_conn.cursor()
                # Delete study items created by mock test user
                cur.execute("DELETE FROM public.study_items WHERE profile_id = %s", (TEST_USER_ID,))
                print("Cleaned up study items for test user from Database.")
                cur.close()
                cls.db_conn.close()
            except Exception as e:
                print(f"Error cleaning up database: {e}")

        print("\n=== Stopping Background Backend Servers ===")
        if cls.node_proc:
            print("Stopping Node.js Gateway server...")
            cls.node_proc.terminate()
            cls.node_proc.wait()
        if cls.fastapi_proc:
            print("Stopping FastAPI RAG server...")
            cls.fastapi_proc.terminate()
            cls.fastapi_proc.wait()
        print("Servers stopped cleanly.")

    def test_01_get_notebooks(self):
        """Test retrieving notebooks (GET /api/notebooks)"""
        headers = {"x-test-bypass": "true"}
        res = requests.get(f"{NODE_URL}/api/notebooks", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_02_create_notebook(self):
        """Test creating a new notebook (POST /api/notebooks)"""
        headers = {"x-test-bypass": "true"}
        payload = {"title": "Test Integration Notebook"}
        res = requests.post(f"{NODE_URL}/api/notebooks", json=payload, headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("id", data)
        self.notebook_id = data["id"]
        # Save it on class level for subsequent tests
        self.__class__.notebook_id = data["id"]

    def test_03_create_text_item(self):
        """Test uploading a text document (POST /api/items/text) - triggers FastAPI process-text"""
        headers = {"x-test-bypass": "true"}
        payload = {
            "text": "The Raven is a narrative poem by American writer Edgar Allan Poe. Published in January 1845, the poem is often noted for its musicality, stylized language, and supernatural atmosphere.",
            "notebook_id": self.__class__.notebook_id
        }
        print("\nSending text to process-text (RAG & Generation)...")
        res = requests.post(f"{NODE_URL}/api/items/text", json=payload, headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("id", data)
        self.__class__.item_id = data["id"]
        print(f"Created text item with ID: {self.__class__.item_id}")

    def test_04_get_items(self):
        """Test retrieving items (GET /api/items)"""
        headers = {"x-test-bypass": "true"}
        res = requests.get(f"{NODE_URL}/api/items", headers=headers)
        self.assertEqual(res.status_code, 200)
        items = res.json()
        self.assertIsInstance(items, list)
        # Ensure our created item is in the list
        item_ids = [item["id"] for item in items]
        self.assertIn(self.__class__.item_id, item_ids)

    def test_05_get_item_details(self):
        """Test retrieving specific item details (GET /api/items/:id)"""
        headers = {"x-test-bypass": "true"}
        res = requests.get(f"{NODE_URL}/api/items/{self.__class__.item_id}", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["id"], self.__class__.item_id)
        self.assertEqual(data["kind"], "text")
        self.assertIn("Raven", data["content"])

    def test_06_update_notes(self):
        """Test updating item notes (PUT /api/items/:id/notes)"""
        headers = {"x-test-bypass": "true"}
        payload = {"notes": "These are my custom study notes for Edgar Allan Poe's Raven."}
        res = requests.put(f"{NODE_URL}/api/items/{self.__class__.item_id}/notes", json=payload, headers=headers)
        self.assertEqual(res.status_code, 200)

        # Retrieve and verify note update
        res_get = requests.get(f"{NODE_URL}/api/items/{self.__class__.item_id}", headers=headers)
        self.assertEqual(res_get.json()["notes"], payload["notes"])

    def test_07_chat_qa(self):
        """Test chat Q&A system (POST /api/items/:id/chat) - triggers FastAPI chat"""
        headers = {"x-test-bypass": "true"}
        payload = {
            "question": "Who wrote the poem The Raven?",
            "selectedSourceIds": [self.__class__.item_id]
        }
        print("\nSending question to chat RAG (AI model query)...")
        res = requests.post(f"{NODE_URL}/api/items/{self.__class__.item_id}/chat", json=payload, headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("content", data)
        print(f"Chat Response: {data['content']}")
        self.assertTrue(any(word in data["content"].lower() for word in ["poe", "edgar", "author", "writer"]))

    def test_08_pin_note(self):
        """Test pinning a note (POST /api/items/{id}/pins)"""
        headers = {"x-test-bypass": "true"}
        payload = {"content": "Edgar Allan Poe is the author of The Raven."}
        res = requests.post(f"{NODE_URL}/api/items/{self.__class__.item_id}/pins", json=payload, headers=headers)
        self.assertEqual(res.status_code, 200)

    def test_09_delete_item(self):
        """Test deleting study item (DELETE /api/items/:id)"""
        headers = {"x-test-bypass": "true"}
        res = requests.delete(f"{NODE_URL}/api/items/{self.__class__.item_id}", headers=headers)
        self.assertEqual(res.status_code, 200)

        # Verify item is deleted
        res_get = requests.get(f"{NODE_URL}/api/items/{self.__class__.item_id}", headers=headers)
        self.assertEqual(res_get.status_code, 404)

if __name__ == "__main__":
    unittest.main()
