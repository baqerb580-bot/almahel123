import requests
import sys
from datetime import datetime, timezone
import json

class ManagementSystemAPITester:
    def __init__(self):
        self.base_url = "https://critical-fix-3.preview.emergentagent.com/api"
        self.tokens = {}
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, system=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if system and system in self.tokens:
            headers['Authorization'] = f'Bearer {self.tokens[system]}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json() if response.text else {}
                    if isinstance(response_data, dict) and 'token' in response_data:
                        print("   Token received")
                    elif isinstance(response_data, list):
                        print(f"   Returned {len(response_data)} items")
                    elif isinstance(response_data, dict):
                        print(f"   Response keys: {list(response_data.keys())}")
                except:
                    print("   Response: Non-JSON or empty")
                return success, response_data if 'response_data' in locals() else {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json().get('detail', 'No error details')
                    print(f"   Error: {error_detail}")
                    self.failed_tests.append(f"{name}: {response.status_code} - {error_detail}")
                except:
                    print(f"   Response text: {response.text[:200]}...")
                    self.failed_tests.append(f"{name}: {response.status_code} - {response.text[:100]}")

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name}: Exception - {str(e)}")
            return False, {}
        
        return False, {}

    def test_login(self, username, password, system_name):
        """Test login and store token for a system"""
        success, response = self.run_test(
            f"Login {system_name} ({username})",
            "POST",
            "auth/login",
            200,
            data={"username": username, "password": password}
        )
        if success and 'token' in response:
            self.tokens[system_name] = response['token']
            return True
        return False

    def test_repair_system_endpoints(self):
        """Test phone repair system endpoints (baqerr)"""
        if 'baqerr' not in self.tokens:
            print("❌ No baqerr token available, skipping repair system tests")
            return

        print("\n📱 Testing Phone Repair System Endpoints...")
        
        # Test repairs endpoint
        self.run_test("Get Repairs", "GET", "repairs", 200, system="baqerr")
        
        # Test repair-debts endpoint  
        self.run_test("Get Repair Debts", "GET", "repair-debts", 200, system="baqerr")
        
        # Test the critical repair-debts/stats endpoint that was fixed
        self.run_test("Get Repair Debts Stats (CRITICAL FIX)", "GET", "repair-debts/stats", 200, system="baqerr")
        
        # Test spare parts endpoint
        self.run_test("Get Spare Parts", "GET", "parts", 200, system="baqerr")
        
        # Test repairs stats
        self.run_test("Get Repairs Stats", "GET", "repairs/stats", 200, system="baqerr")
        
        # Test employee management endpoints
        self.run_test("Get Phone System Employees", "GET", "phones/employees", 200, system="baqerr")

        # Test adding a maintenance record
        maintenance_data = {
            "customer_name": "Test Customer",
            "customer_phone": "07123456789",
            "phone_model": "iPhone 13",
            "issue_description": "Screen replacement",
            "repair_cost": 100000,
            "parts_used": [{"name": "Screen", "cost": 50000}],
            "paid_amount": 50000,
            "due_date": "2024-12-31"
        }
        
        success, response = self.run_test("Add Maintenance Record", "POST", "repairs", 201, maintenance_data, "baqerr")
        if success and 'id' in response:
            repair_id = response['id']
            print(f"   Created repair ID: {repair_id}")
            
            # Test if repair appears in list immediately (testing the fix)
            success_list, list_response = self.run_test("Verify Repair in List", "GET", "repairs", 200, system="baqerr")
            if success_list and isinstance(list_response, list):
                repair_found = any(r.get('id') == repair_id for r in list_response)
                if repair_found:
                    print("✅ Maintenance record appears in list immediately after creation")
                else:
                    print("❌ Maintenance record NOT found in list after creation")
                    self.failed_tests.append("Maintenance record visibility issue")

    def test_agents_system_endpoints(self):
        """Test agents system endpoints (uakel)"""
        if 'uakel' not in self.tokens:
            print("❌ No uakel token available, skipping agents system tests")
            return

        print("\n📊 Testing Agents System Endpoints...")
        
        # Test agents endpoints
        self.run_test("Get Agents", "GET", "agents", 200, system="uakel")
        self.run_test("Get Agents Stats", "GET", "agents/stats", 200, system="uakel")

    def test_tasks_system_endpoints(self):
        """Test tasks system endpoints (admin)"""
        if 'tasks' not in self.tokens:
            print("❌ No tasks token available, skipping tasks system tests")
            return

        print("\n📋 Testing Tasks System Endpoints...")
        
        self.run_test("Get Tasks", "GET", "tasks", 200, system="tasks")
        self.run_test("Get Technicians", "GET", "technicians", 200, system="tasks")
        self.run_test("Get Stats", "GET", "stats", 200, system="tasks")

    def test_debts_system_endpoints(self):
        """Test debts system endpoints (gzbm)"""
        if 'debts' not in self.tokens:
            print("❌ No debts token available, skipping debts system tests")
            return

        print("\n💳 Testing Debts System Endpoints...")
        
        self.run_test("Get Debts", "GET", "debts", 200, system="debts")
        self.run_test("Get Debts Stats", "GET", "debts/stats", 200, system="debts")

    def test_user_management_endpoints(self):
        """Test user management endpoints"""
        print("\n👥 Testing User Management Endpoints...")
        
        for system in ['baqerr', 'uakel']:
            if system in self.tokens:
                self.run_test(f"Get Users ({system})", "GET", "users", 200, system=system)

def main():
    print("🚀 Starting Management System API Testing...")
    print("=" * 60)
    
    tester = ManagementSystemAPITester()
    
    # Test login for all systems
    print("\n🔐 Testing Authentication...")
    systems_to_test = [
        ("admin", "198212", "tasks"),
        ("gzbm", "1010", "debts"), 
        ("baqerr", "11223300", "baqerr"),
        ("uakel", "1111", "uakel")
    ]
    
    successful_logins = 0
    for username, password, system_name in systems_to_test:
        if tester.test_login(username, password, system_name):
            successful_logins += 1
    
    print(f"\n📊 Authentication Summary: {successful_logins}/{len(systems_to_test)} systems logged in successfully")
    
    if successful_logins == 0:
        print("❌ No successful logins. Cannot proceed with endpoint testing.")
        return 1
    
    # Test all system endpoints
    tester.test_repair_system_endpoints()
    tester.test_agents_system_endpoints()
    tester.test_tasks_system_endpoints()
    tester.test_debts_system_endpoints()
    tester.test_user_management_endpoints()
    
    # Print final results
    print("\n" + "=" * 60)
    print("📊 FINAL TEST RESULTS")
    print("=" * 60)
    print(f"✅ Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"❌ Tests failed: {len(tester.failed_tests)}")
    
    if tester.failed_tests:
        print("\n🔍 Failed Tests Details:")
        for failure in tester.failed_tests:
            print(f"   • {failure}")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"\n📈 Success Rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("🎉 Overall Result: GOOD - System is functioning well")
        return 0
    elif success_rate >= 60:
        print("⚠️  Overall Result: FAIR - Some issues need attention")
        return 1
    else:
        print("🚨 Overall Result: POOR - Critical issues need immediate attention")
        return 1

if __name__ == "__main__":
    sys.exit(main())