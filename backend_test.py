#!/usr/bin/env python3
"""
Backend API Testing for Task Management System
Testing the new features: report viewing, task editing, and task completion with reports
"""

import requests
import sys
import json
from datetime import datetime

class TaskManagementAPITester:
    def __init__(self, base_url="https://deployment-suite-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_user = None
        self.employee_user = None
        self.test_task_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        if data:
            print(f"   Data: {json.dumps(data, indent=2)}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            print(f"   Response Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(response_data) < 10:
                        print(f"   Response: {json.dumps(response_data, indent=2)}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login with credentials admin/198212"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"username": "admin", "password": "198212"}
        )
        if success and 'token' in response:
            self.token = response['token']
            self.admin_user = response['user']
            print(f"   Admin logged in: {self.admin_user.get('name', 'Unknown')}")
            return True
        return False

    def test_get_technicians(self):
        """Test getting list of technicians/employees"""
        success, response = self.run_test(
            "Get Technicians",
            "GET",
            "technicians",
            200
        )
        if success:
            print(f"   Found {len(response)} technicians")
            if response:
                self.employee_user = response[0]  # Use first employee for testing
                print(f"   Using employee: {self.employee_user.get('name', 'Unknown')}")
        return success

    def test_create_employee(self):
        """Test creating a new employee"""
        employee_data = {
            "username": "emp1",
            "name": "موظف تجريبي",
            "password": "123456",
            "role": "employee",
            "system": "tasks",
            "permissions": ["view_tasks", "edit_task"],
            "telegram_chat_id": "123456789"
        }
        
        success, response = self.run_test(
            "Create Employee",
            "POST",
            "users",
            200,
            data=employee_data
        )
        
        if success:
            self.employee_user = response
            print(f"   Created employee: {response.get('name', 'Unknown')}")
        
        return success

    def test_create_task(self):
        """Test creating a new task and assigning to employee"""
        if not self.employee_user:
            print("❌ No employee available for task assignment")
            return False
            
        task_data = {
            "customer_name": "زبون تجريبي",
            "customer_phone": "07901234567",
            "customer_address": "بغداد - الكرادة",
            "issue_description": "مشكلة في الإنترنت",
            "assigned_to": self.employee_user['id']
        }
        
        success, response = self.run_test(
            "Create Task",
            "POST",
            "tasks",
            200,
            data=task_data
        )
        
        if success and 'task_id' in response:
            self.test_task_id = response['task_id']
            print(f"   Created task ID: {self.test_task_id}")
        
        return success

    def test_get_tasks(self):
        """Test getting list of tasks"""
        success, response = self.run_test(
            "Get Tasks",
            "GET",
            "tasks",
            200
        )
        
        if success:
            print(f"   Found {len(response)} tasks")
            if response and not self.test_task_id:
                self.test_task_id = response[0]['id']
                print(f"   Using existing task ID: {self.test_task_id}")
        
        return success

    def test_update_task(self):
        """Test updating a task using PUT /api/tasks/{task_id}"""
        if not self.test_task_id:
            print("❌ No task ID available for update test")
            return False
            
        update_data = {
            "customer_name": "زبون محدث",
            "customer_phone": "07901234567",
            "customer_address": "بغداد - الكرادة - محدث",
            "issue_description": "مشكلة في الإنترنت - محدثة",
            "assigned_to": self.employee_user['id'] if self.employee_user else None
        }
        
        success, response = self.run_test(
            "Update Task (PUT)",
            "PUT",
            f"tasks/{self.test_task_id}",
            200,
            data=update_data
        )
        
        return success

    def test_complete_task_with_report(self):
        """Test completing a task with report using POST /api/tasks/{task_id}/complete"""
        if not self.test_task_id:
            print("❌ No task ID available for completion test")
            return False
            
        # First, let's try to start the task
        self.run_test(
            "Accept Task",
            "POST",
            f"tasks/{self.test_task_id}/accept",
            200
        )
        
        self.run_test(
            "Start Task",
            "POST",
            f"tasks/{self.test_task_id}/start",
            200
        )
        
        # Now complete with report
        completion_data = {
            "report_text": "تم حل المشكلة بنجاح. تم إعادة تشغيل الراوتر وإعادة ضبط الإعدادات.",
            "success": True,
            "images": []
        }
        
        success, response = self.run_test(
            "Complete Task with Report",
            "POST",
            f"tasks/{self.test_task_id}/complete",
            200,
            data=completion_data
        )
        
        return success

    def test_complete_task_failure(self):
        """Test completing a task with failure report"""
        # Create another task for failure test
        if self.employee_user:
            task_data = {
                "customer_name": "زبون تجريبي 2",
                "customer_phone": "07901234568",
                "customer_address": "بغداد - الجادرية",
                "issue_description": "مشكلة معقدة",
                "assigned_to": self.employee_user['id']
            }
            
            success, response = self.run_test(
                "Create Task for Failure Test",
                "POST",
                "tasks",
                200,
                data=task_data
            )
            
            if success and 'task_id' in response:
                failure_task_id = response['task_id']
                
                # Accept and start task
                self.run_test("Accept Failure Task", "POST", f"tasks/{failure_task_id}/accept", 200)
                self.run_test("Start Failure Task", "POST", f"tasks/{failure_task_id}/start", 200)
                
                # Complete with failure
                completion_data = {
                    "report_text": "لم يتم حل المشكلة. تحتاج إلى قطع غيار إضافية.",
                    "success": False,
                    "images": []
                }
                
                return self.run_test(
                    "Complete Task with Failure Report",
                    "POST",
                    f"tasks/{failure_task_id}/complete",
                    200,
                    data=completion_data
                )[0]
        
        return False

    def test_get_stats(self):
        """Test getting dashboard statistics"""
        success, response = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "stats",
            200
        )
        
        if success:
            print(f"   Stats: {json.dumps(response, indent=2)}")
        
        return success

    def test_notifications(self):
        """Test notifications endpoints"""
        success1, _ = self.run_test(
            "Get Notifications",
            "GET",
            "notifications",
            200
        )
        
        success2, response = self.run_test(
            "Get Unread Count",
            "GET",
            "notifications/unread/count",
            200
        )
        
        if success2:
            print(f"   Unread notifications: {response.get('count', 0)}")
        
        return success1 and success2

    def test_api_root(self):
        """Test API root endpoint"""
        success, response = self.run_test(
            "API Root",
            "GET",
            "",
            200
        )
        return success

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Task Management System API Tests")
        print(f"🌐 Backend URL: {self.base_url}")
        print("=" * 60)

        # Test sequence
        tests = [
            ("API Root", self.test_api_root),
            ("Admin Login", self.test_admin_login),
            ("Get Technicians", self.test_get_technicians),
            ("Create Employee", self.test_create_employee),
            ("Create Task", self.test_create_task),
            ("Get Tasks", self.test_get_tasks),
            ("Update Task (PUT)", self.test_update_task),
            ("Complete Task with Success Report", self.test_complete_task_with_report),
            ("Complete Task with Failure Report", self.test_complete_task_failure),
            ("Get Dashboard Stats", self.test_get_stats),
            ("Test Notifications", self.test_notifications),
        ]

        for test_name, test_func in tests:
            try:
                result = test_func()
                if not result:
                    print(f"⚠️  {test_name} failed but continuing...")
            except Exception as e:
                print(f"💥 {test_name} crashed: {str(e)}")

        # Print results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = TaskManagementAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())