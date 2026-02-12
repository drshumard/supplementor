#!/usr/bin/env python3
"""
Backend API Testing for Supplement Protocol Management App
Tests all endpoints with proper authentication and data flow
"""
import requests
import json
import sys
from datetime import datetime

class SupplementAPITester:
    def __init__(self, base_url="https://clarity-supplements.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.hc_token = None
        self.test_plan_id = None
        self.test_supplement_id = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None, description=""):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        if description:
            print(f"   {description}")
        
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
                print(f"✅ PASSED - Status: {response.status_code}")
                try:
                    resp_data = response.json()
                    if isinstance(resp_data, dict) and len(resp_data) <= 3:
                        print(f"   Response: {resp_data}")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error text: {response.text[:200]}")

            return success, response.json() if success and response.headers.get('content-type', '').startswith('application/json') else {}

        except requests.RequestException as e:
            print(f"❌ FAILED - Network error: {str(e)}")
            return False, {}
        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "/health",
            200,
            description="Basic health check"
        )
        return success

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "/auth/login",
            200,
            data={"email": "admin@clarity.com", "password": "admin123"},
            description="Login with admin credentials"
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   Admin user: {response.get('user', {}).get('name')}")
            return True
        return False

    def test_hc_login(self):
        """Test HC login"""
        success, response = self.run_test(
            "HC Login",
            "POST",
            "/auth/login",
            200,
            data={"email": "hc@clarity.com", "password": "hc123"},
            description="Login with HC credentials"
        )
        if success and 'token' in response:
            self.hc_token = response['token']
            print(f"   HC user: {response.get('user', {}).get('name')}")
            return True
        return False

    def test_invalid_login(self):
        """Test invalid login credentials"""
        success, response = self.run_test(
            "Invalid Login",
            "POST",
            "/auth/login",
            401,
            data={"email": "invalid@test.com", "password": "wrongpass"},
            description="Should reject invalid credentials"
        )
        return success

    def test_get_me(self):
        """Test get current user info"""
        if not self.admin_token:
            return False
            
        success, response = self.run_test(
            "Get User Info",
            "GET",
            f"/auth/me?token={self.admin_token}",
            200,
            description="Get current user details"
        )
        return success

    def test_list_supplements(self):
        """Test listing supplements"""
        success, response = self.run_test(
            "List Supplements",
            "GET",
            "/supplements",
            200,
            token=self.admin_token,
            description="Should return pre-seeded supplements"
        )
        if success:
            supps_count = len(response.get('supplements', []))
            print(f"   Found {supps_count} supplements")
            return supps_count >= 60  # Should have around 68 pre-seeded
        return False

    def test_search_supplements(self):
        """Test supplement search"""
        success, response = self.run_test(
            "Search Supplements",
            "GET",
            "/supplements?search=vitamin",
            200,
            token=self.admin_token,
            description="Search for vitamins"
        )
        if success:
            count = len(response.get('supplements', []))
            print(f"   Found {count} supplements matching 'vitamin'")
        return success

    def test_create_supplement(self):
        """Test creating a supplement"""
        test_supp_data = {
            "supplement_name": "Test Vitamin D3",
            "company": "Test Brand",
            "units_per_bottle": 90,
            "unit_type": "caps",
            "default_quantity_per_dose": 1,
            "default_frequency_per_day": 1,
            "cost_per_bottle": 25.99,
            "default_instructions": "With food",
            "active": True
        }
        
        success, response = self.run_test(
            "Create Supplement",
            "POST",
            "/supplements",
            200,
            data=test_supp_data,
            token=self.admin_token,
            description="Create new supplement"
        )
        if success and '_id' in response:
            self.test_supplement_id = response['_id']
            print(f"   Created supplement ID: {self.test_supplement_id}")
        return success

    def test_update_supplement(self):
        """Test updating a supplement"""
        if not self.test_supplement_id:
            return False
            
        update_data = {
            "cost_per_bottle": 29.99,
            "notes": "Updated test supplement"
        }
        
        success, response = self.run_test(
            "Update Supplement",
            "PUT",
            f"/supplements/{self.test_supplement_id}",
            200,
            data=update_data,
            token=self.admin_token,
            description="Update supplement cost and notes"
        )
        return success

    def test_list_templates(self):
        """Test listing templates"""
        success, response = self.run_test(
            "List Templates",
            "GET",
            "/templates",
            200,
            token=self.admin_token,
            description="Should return pre-seeded templates"
        )
        if success:
            templates_count = len(response.get('templates', []))
            print(f"   Found {templates_count} templates")
            return templates_count >= 9  # Should have 9 templates (3 programs x 3 steps)
        return False

    def test_filter_templates(self):
        """Test filtering templates by program"""
        success, response = self.run_test(
            "Filter Templates by Program",
            "GET",
            "/templates?program_name=Detox%201",
            200,
            token=self.admin_token,
            description="Filter templates for Detox 1 program"
        )
        if success:
            count = len(response.get('templates', []))
            print(f"   Found {count} Detox 1 templates")
        return success

    def test_create_plan(self):
        """Test creating a patient plan"""
        plan_data = {
            "patient_name": "Test Patient John",
            "date": "2025-08-01",
            "program_name": "Detox 1",
            "step_label": "Step 1",
            "step_number": 1,
            "months": [
                {
                    "month_number": 1,
                    "supplements": [
                        {
                            "supplement_name": "Basic Multi",
                            "company": "Test Co",
                            "quantity_per_dose": 2,
                            "frequency_per_day": 1,
                            "units_per_bottle": 90,
                            "cost_per_bottle": 35.00
                        }
                    ],
                    "monthly_total_cost": 0
                }
            ]
        }
        
        success, response = self.run_test(
            "Create Plan",
            "POST",
            "/plans",
            200,
            data=plan_data,
            token=self.admin_token,
            description="Create new patient plan"
        )
        if success and '_id' in response:
            self.test_plan_id = response['_id']
            print(f"   Created plan ID: {self.test_plan_id}")
        return success

    def test_list_plans(self):
        """Test listing patient plans"""
        success, response = self.run_test(
            "List Plans",
            "GET",
            "/plans",
            200,
            token=self.admin_token,
            description="List all patient plans"
        )
        if success:
            count = len(response.get('plans', []))
            print(f"   Found {count} plans")
        return success

    def test_get_plan(self):
        """Test getting a specific plan"""
        if not self.test_plan_id:
            return False
            
        success, response = self.run_test(
            "Get Plan Details",
            "GET",
            f"/plans/{self.test_plan_id}",
            200,
            token=self.admin_token,
            description="Get plan details with calculations"
        )
        if success:
            months = response.get('months', [])
            print(f"   Plan has {len(months)} month(s)")
            total = response.get('total_program_cost', 0)
            print(f"   Total program cost: ${total}")
        return success

    def test_update_plan(self):
        """Test updating a plan"""
        if not self.test_plan_id:
            return False
            
        update_data = {
            "patient_name": "Updated Patient Name",
            "months": [
                {
                    "month_number": 1,
                    "supplements": [
                        {
                            "supplement_name": "Updated Multi",
                            "quantity_per_dose": 3,
                            "frequency_per_day": 2,
                            "cost_per_bottle": 40.00
                        }
                    ]
                }
            ]
        }
        
        success, response = self.run_test(
            "Update Plan",
            "PUT",
            f"/plans/{self.test_plan_id}",
            200,
            data=update_data,
            token=self.admin_token,
            description="Update plan details and recalculate costs"
        )
        return success

    def test_search_plans(self):
        """Test searching plans"""
        success, response = self.run_test(
            "Search Plans",
            "GET",
            "/plans?search=Test%20Patient",
            200,
            token=self.admin_token,
            description="Search for plans by patient name"
        )
        return success

    def test_pdf_exports(self):
        """Test PDF export endpoints"""
        if not self.test_plan_id:
            return False

        # Test patient PDF export
        print(f"\n🔍 Testing Patient PDF Export...")
        try:
            url = f"{self.base_url}/plans/{self.test_plan_id}/export/patient"
            response = requests.get(url)
            if response.status_code == 200 and response.headers.get('content-type') == 'application/pdf':
                print("✅ PASSED - Patient PDF export working")
                print(f"   PDF size: {len(response.content)} bytes")
                self.tests_passed += 1
            else:
                print(f"❌ FAILED - Expected PDF, got status {response.status_code}")
        except Exception as e:
            print(f"❌ FAILED - Error: {e}")
        self.tests_run += 1

        # Test HC PDF export
        print(f"\n🔍 Testing HC PDF Export...")
        try:
            url = f"{self.base_url}/plans/{self.test_plan_id}/export/hc"
            response = requests.get(url)
            if response.status_code == 200 and response.headers.get('content-type') == 'application/pdf':
                print("✅ PASSED - HC PDF export working")
                print(f"   PDF size: {len(response.content)} bytes")
                self.tests_passed += 1
            else:
                print(f"❌ FAILED - Expected PDF, got status {response.status_code}")
        except Exception as e:
            print(f"❌ FAILED - Error: {e}")
        self.tests_run += 1

        return True

    def test_hc_access_restrictions(self):
        """Test role-based access control fixes"""
        if not self.hc_token:
            return False
        
        print(f"\n🔒 Testing Role-Based Access Control Fixes...")
        
        # 1. HC should get 403 when trying to POST /api/supplements
        success1, response = self.run_test(
            "HC POST Supplement (Should get 403)",
            "POST",
            "/supplements",
            403,  # Expecting 403 Forbidden
            data={"supplement_name": "HC Test", "active": True},
            token=self.hc_token,
            description="HC role should get 403 for supplement creation"
        )
        
        # 2. HC should get 403 when trying to PUT /api/supplements/{id}
        # First get a supplement ID
        supp_list_success, supp_response = self.run_test(
            "Get Supplement for Update Test",
            "GET",
            "/supplements?limit=1",
            200,
            token=self.admin_token,
            description="Get supplement ID for update test"
        )
        
        success2 = False
        if supp_list_success and supp_response.get('supplements'):
            supp_id = supp_response['supplements'][0]['_id']
            success2, response = self.run_test(
                "HC PUT Supplement (Should get 403)",
                "PUT",
                f"/supplements/{supp_id}",
                403,
                data={"cost_per_bottle": 99.99},
                token=self.hc_token,
                description="HC role should get 403 for supplement update"
            )
        
        # 3. HC should get 403 when trying to DELETE /api/supplements/{id}
        success3 = False
        if supp_list_success and supp_response.get('supplements'):
            supp_id = supp_response['supplements'][0]['_id']
            success3, response = self.run_test(
                "HC DELETE Supplement (Should get 403)",
                "DELETE",
                f"/supplements/{supp_id}",
                403,
                token=self.hc_token,
                description="HC role should get 403 for supplement deletion"
            )
        
        # 4. HC should get 403 when trying to PUT /api/templates/{id}
        # First get a template ID
        tmpl_list_success, tmpl_response = self.run_test(
            "Get Template for Update Test",
            "GET",
            "/templates?limit=1",
            200,
            token=self.admin_token,
            description="Get template ID for update test"
        )
        
        success4 = False
        if tmpl_list_success and tmpl_response.get('templates'):
            tmpl_id = tmpl_response['templates'][0]['_id']
            success4, response = self.run_test(
                "HC PUT Template (Should get 403)",
                "PUT",
                f"/templates/{tmpl_id}",
                403,
                data={"program_name": "Updated by HC"},
                token=self.hc_token,
                description="HC role should get 403 for template update"
            )
        
        return success1 and success2 and success3 and success4

    def cleanup(self):
        """Clean up test data"""
        print(f"\n🧹 Cleaning up test data...")
        
        # Delete test plan
        if self.test_plan_id and self.admin_token:
            try:
                success, _ = self.run_test(
                    "Delete Test Plan",
                    "DELETE",
                    f"/plans/{self.test_plan_id}",
                    200,
                    token=self.admin_token,
                    description="Clean up test plan"
                )
            except:
                pass

        # Delete test supplement
        if self.test_supplement_id and self.admin_token:
            try:
                success, _ = self.run_test(
                    "Delete Test Supplement",
                    "DELETE",
                    f"/supplements/{self.test_supplement_id}",
                    200,
                    token=self.admin_token,
                    description="Clean up test supplement"
                )
            except:
                pass

def main():
    print("🚀 Starting Supplement Protocol API Tests")
    print("=" * 50)
    
    tester = SupplementAPITester()
    
    try:
        # Core functionality tests
        if not tester.test_health_check():
            print("\n❌ Health check failed - aborting tests")
            return 1

        if not tester.test_admin_login():
            print("\n❌ Admin login failed - aborting tests")
            return 1

        if not tester.test_hc_login():
            print("\n❌ HC login failed - continuing with limited tests")

        # Auth tests
        tester.test_invalid_login()
        tester.test_get_me()

        # Supplement management tests
        tester.test_list_supplements()
        tester.test_search_supplements()
        tester.test_create_supplement()
        tester.test_update_supplement()

        # Template tests
        tester.test_list_templates()
        tester.test_filter_templates()

        # Plan management tests
        tester.test_create_plan()
        tester.test_list_plans()
        tester.test_get_plan()
        tester.test_update_plan()
        tester.test_search_plans()

        # PDF export tests
        tester.test_pdf_exports()

        # Role-based access tests
        tester.test_hc_access_restrictions()

        # Cleanup
        tester.cleanup()

    except KeyboardInterrupt:
        print("\n\n⚠️ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n\n💥 Unexpected error: {e}")
        return 1

    # Results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"🎯 Success rate: {success_rate:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️ {tester.tests_run - tester.tests_passed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())