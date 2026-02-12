#!/usr/bin/env python3
"""
Focused Role-Based Access Control Testing
Testing specific bug fixes from iteration 2
"""
import requests
import json
import sys

class RoleAccessTester:
    def __init__(self, base_url="https://clarity-supplements.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.hc_token = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 {name}")
        
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
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    error = response.json()
                    print(f"   Error: {error}")
                except:
                    print(f"   Error text: {response.text[:200]}")
            return success, response.json() if success and response.headers.get('content-type', '').startswith('application/json') else {}
        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            return False, {}

    def login_users(self):
        """Login both admin and HC users"""
        print("🚀 Logging in users...")
        
        # Admin login
        success, response = self.run_test(
            "Admin Login", "POST", "/auth/login", 200,
            data={"email": "admin@clarity.com", "password": "admin123"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   Admin: {response.get('user', {}).get('name')}")
        else:
            print("❌ Admin login failed - aborting tests")
            return False
        
        # HC login
        success, response = self.run_test(
            "HC Login", "POST", "/auth/login", 200,
            data={"email": "hc@clarity.com", "password": "hc123"}
        )
        if success and 'token' in response:
            self.hc_token = response['token']
            print(f"   HC: {response.get('user', {}).get('name')}")
            return True
        else:
            print("❌ HC login failed - aborting tests")
            return False

    def test_hc_supplement_restrictions(self):
        """Test HC cannot modify supplements"""
        print(f"\n{'='*50}")
        print("🔒 Testing HC Supplement Restrictions (Should get 403)")
        print("="*50)
        
        results = []
        
        # 1. HC POST supplement (should get 403)
        success, _ = self.run_test(
            "HC POST Supplement (Should Fail)",
            "POST", "/supplements", 403,
            data={"supplement_name": "HC Test Blocked", "active": True},
            token=self.hc_token
        )
        results.append(success)
        
        # Get a supplement ID for update/delete tests
        success, response = self.run_test(
            "Get Supplement for Testing", "GET", "/supplements?limit=1", 200,
            token=self.admin_token
        )
        
        if success and response.get('supplements'):
            supp_id = response['supplements'][0]['_id']
            
            # 2. HC PUT supplement (should get 403)
            success, _ = self.run_test(
                "HC PUT Supplement (Should Fail)",
                "PUT", f"/supplements/{supp_id}", 403,
                data={"cost_per_bottle": 999.99},
                token=self.hc_token
            )
            results.append(success)
            
            # 3. HC DELETE supplement (should get 403)
            success, _ = self.run_test(
                "HC DELETE Supplement (Should Fail)",
                "DELETE", f"/supplements/{supp_id}", 403,
                token=self.hc_token
            )
            results.append(success)
        
        return all(results)
    
    def test_hc_template_restrictions(self):
        """Test HC cannot modify templates"""
        print(f"\n🔒 Testing HC Template Restrictions (Should get 403)")
        
        # Get a template ID
        success, response = self.run_test(
            "Get Template for Testing", "GET", "/templates?limit=1", 200,
            token=self.admin_token
        )
        
        if success and response.get('templates'):
            tmpl_id = response['templates'][0]['_id']
            
            # HC PUT template (should get 403)
            success, _ = self.run_test(
                "HC PUT Template (Should Fail)",
                "PUT", f"/templates/{tmpl_id}", 403,
                data={"program_name": "Blocked Update"},
                token=self.hc_token
            )
            return success
        
        return False
    
    def test_admin_supplement_access(self):
        """Test admin CAN modify supplements"""
        print(f"\n🔑 Testing Admin Supplement Access (Should Work)")
        
        # Create supplement
        success, response = self.run_test(
            "Admin POST Supplement",
            "POST", "/supplements", 200,
            data={
                "supplement_name": "Admin Test Fix Verification",
                "company": "Test Co",
                "units_per_bottle": 60,
                "cost_per_bottle": 29.99,
                "active": True
            },
            token=self.admin_token
        )
        
        created_id = None
        if success and '_id' in response:
            created_id = response['_id']
            
            # Update supplement
            success2, _ = self.run_test(
                "Admin PUT Supplement",
                "PUT", f"/supplements/{created_id}", 200,
                data={"cost_per_bottle": 39.99},
                token=self.admin_token
            )
            
            # Delete supplement (cleanup)
            success3, _ = self.run_test(
                "Admin DELETE Supplement",
                "DELETE", f"/supplements/{created_id}", 200,
                token=self.admin_token
            )
            
            return success and success2 and success3
        
        return success
    
    def test_dashboard_filter_all(self):
        """Test dashboard filter with empty string (all plans)"""
        print(f"\n📊 Testing Dashboard Filter All")
        
        success, response = self.run_test(
            "Dashboard Filter All Plans",
            "GET", "/plans?program=", 200,  # Empty string should return all
            token=self.admin_token
        )
        
        if success:
            total = response.get('total', 0)
            plans_count = len(response.get('plans', []))
            print(f"   Found {plans_count} plans (total: {total})")
        
        return success
    
    def test_pdf_exports_with_auth(self):
        """Test PDF exports work with Authorization headers"""
        print(f"\n📄 Testing PDF Exports with Authorization")
        
        # Get a real supplement ID first
        success, response = self.run_test(
            "Get Supplement for PDF Test", "GET", "/supplements?limit=1", 200,
            token=self.admin_token
        )
        
        if not success or not response.get('supplements'):
            print("❌ Could not get supplement for PDF test")
            return False
            
        supp = response['supplements'][0]
        
        # First create a test plan
        plan_data = {
            "patient_name": "PDF Test Patient",
            "program_name": "Detox 1",
            "step_number": 1,
            "months": [{
                "month_number": 1,
                "supplements": [{
                    "supplement_id": supp['_id'],
                    "supplement_name": supp['supplement_name'],
                    "company": supp.get('company', ''),
                    "quantity_per_dose": 1,
                    "frequency_per_day": 1,
                    "units_per_bottle": supp.get('units_per_bottle', 60),
                    "cost_per_bottle": 25.00
                }]
            }]
        }
        
        success, response = self.run_test(
            "Create Test Plan for PDF",
            "POST", "/plans", 200,
            data=plan_data, token=self.admin_token
        )
        
        if not success or '_id' not in response:
            print("❌ Failed to create test plan for PDF testing")
            return False
            
        plan_id = response['_id']
        
        # Test patient PDF export
        try:
            url = f"{self.base_url}/plans/{plan_id}/export/patient"
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                pdf_size = len(response.content)
                if 'pdf' in content_type or pdf_size > 1000:
                    print("✅ Patient PDF Export - PASSED")
                    print(f"   Content-Type: {content_type}, Size: {pdf_size} bytes")
                    patient_pdf_ok = True
                else:
                    print(f"❌ Patient PDF Export - Invalid content: {content_type}")
                    patient_pdf_ok = False
            else:
                print(f"❌ Patient PDF Export - Status: {response.status_code}")
                patient_pdf_ok = False
        except Exception as e:
            print(f"❌ Patient PDF Export - Error: {e}")
            patient_pdf_ok = False
        
        # Test HC PDF export
        try:
            url = f"{self.base_url}/plans/{plan_id}/export/hc"
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                pdf_size = len(response.content)
                if 'pdf' in content_type or pdf_size > 1000:
                    print("✅ HC PDF Export - PASSED")
                    print(f"   Content-Type: {content_type}, Size: {pdf_size} bytes")
                    hc_pdf_ok = True
                else:
                    print(f"❌ HC PDF Export - Invalid content: {content_type}")
                    hc_pdf_ok = False
            else:
                print(f"❌ HC PDF Export - Status: {response.status_code}")
                hc_pdf_ok = False
        except Exception as e:
            print(f"❌ HC PDF Export - Error: {e}")
            hc_pdf_ok = False
        
        # Cleanup test plan
        try:
            self.run_test(
                "Delete Test Plan",
                "DELETE", f"/plans/{plan_id}", 200,
                token=self.admin_token
            )
        except:
            pass
        
        return patient_pdf_ok and hc_pdf_ok

def main():
    print("🚀 Role-Based Access Control Testing")
    print("Testing bug fixes from iteration 2")
    print("="*50)
    
    tester = RoleAccessTester()
    
    # Login users
    if not tester.login_users():
        return 1
    
    # Run critical tests
    results = []
    
    results.append(tester.test_hc_supplement_restrictions())
    results.append(tester.test_hc_template_restrictions())
    results.append(tester.test_admin_supplement_access())
    results.append(tester.test_dashboard_filter_all())
    results.append(tester.test_pdf_exports_with_auth())
    
    # Print summary
    print(f"\n{'='*50}")
    print("📊 SUMMARY")
    print("="*50)
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"Success rate: {success_rate:.1f}%")
    
    if all(results):
        print("🎉 All critical bug fixes verified!")
        return 0
    else:
        print("❌ Some critical issues remain")
        return 1

if __name__ == "__main__":
    sys.exit(main())