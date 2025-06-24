from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os
from urllib.parse import parse_qs, urlparse
import datetime
import base64
import re

class EstimateHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/.netlify/functions/submit-estimate':
            self.handle_submit_estimate()
        elif self.path == '/.netlify/functions/submit-construction':
            self.handle_submit_construction()
        elif self.path == '/.netlify/functions/delete-construction':
            self.handle_delete_construction()
        else:
            self.send_error(404)
    
    def do_GET(self):
        if self.path.startswith('/.netlify/functions/get-estimates'):
            self.handle_get_estimates()
        elif self.path.startswith('/.netlify/functions/get-construction'):
            self.handle_get_construction()
        else:
            super().do_GET()
    
    def handle_submit_estimate(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            print(f"Received estimate data: {data}")
            
            # 필수 필드 검증
            if not all([data.get('name'), data.get('phone'), data.get('service_type'), data.get('content')]):
                self.send_error_response(400, "모든 필드를 입력해주세요.")
                return
            
            # 견적문의 데이터 생성
            estimate = {
                'id': str(int(datetime.datetime.now().timestamp() * 1000)),
                'title': f"{data['service_type']} 견적문의",
                'name': data['name'],
                'phone': data['phone'],
                'service_type': data['service_type'],
                'content': data['content'],
                'status': '대기중',
                'created_at': datetime.datetime.now().isoformat(),
                'updated_at': datetime.datetime.now().isoformat()
            }
            
            # content/estimates 디렉토리 생성
            os.makedirs('content/estimates', exist_ok=True)
            
            # JSON 파일로 저장
            file_path = f"content/estimates/{estimate['id']}.json"
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(estimate, f, ensure_ascii=False, indent=2)
            
            print(f"Estimate saved to {file_path}")
            
            # 성공 응답
            response = {
                'success': True,
                'message': '견적문의가 성공적으로 접수되었습니다.',
                'id': estimate['id'],
                'estimated_response_time': '24시간 이내'
            }
            
            self.send_json_response(200, response)
            
        except Exception as e:
            print(f"Error processing estimate: {e}")
            self.send_error_response(500, f"서버 오류가 발생했습니다: {str(e)}")
    
    def handle_get_estimates(self):
        try:
            print(f"Handling get-estimates request: {self.path}")
            
            # 쿼리 파라미터 파싱
            parsed_url = urlparse(self.path)
            query_params = parse_qs(parsed_url.query)
            
            page = int(query_params.get('page', [1])[0])
            per_page = int(query_params.get('per_page', [10])[0])
            
            print(f"Page: {page}, Per page: {per_page}")
            
            estimates = []
            estimates_dir = 'content/estimates'
            
            if os.path.exists(estimates_dir):
                for filename in os.listdir(estimates_dir):
                    if filename.endswith('.json'):
                        file_path = os.path.join(estimates_dir, filename)
                        with open(file_path, 'r', encoding='utf-8') as f:
                            estimate = json.load(f)
                            estimates.append(estimate)
            
            print(f"Found {len(estimates)} estimates")
            
            # 날짜순으로 정렬 (최신순)
            estimates.sort(key=lambda x: x['created_at'], reverse=True)
            
            # 페이지네이션 처리
            start_index = (page - 1) * per_page
            end_index = start_index + per_page
            paginated_estimates = estimates[start_index:end_index]
            
            total_pages = (len(estimates) + per_page - 1) // per_page
            
            response = {
                'estimates': paginated_estimates,
                'total': len(estimates),
                'page': page,
                'per_page': per_page,
                'total_pages': total_pages,
                'has_more': page < total_pages
            }
            
            print(f"Returning {len(paginated_estimates)} estimates for page {page}")
            self.send_json_response(200, response)
            
        except Exception as e:
            print(f"Error getting estimates: {e}")
            self.send_error_response(500, f"서버 오류가 발생했습니다: {str(e)}")

    def handle_submit_construction(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            print("Received construction submission request")
            
            # multipart/form-data 파싱 (간단한 버전)
            boundary = self.headers['Content-Type'].split('boundary=')[1]
            parts = post_data.decode('utf-8').split(f'--{boundary}')
            
            title = None
            date = None
            description = None
            image_data = None
            image_name = None
            
            for part in parts:
                if 'Content-Disposition: form-data' in part:
                    lines = part.split('\r\n')
                    field_name = None
                    field_value = None
                    is_file = False
                    
                    for i, line in enumerate(lines):
                        if 'name=' in line:
                            name_match = re.search(r'name="([^"]+)"', line)
                            if name_match:
                                field_name = name_match.group(1)
                        
                        if 'filename=' in line:
                            is_file = True
                            filename_match = re.search(r'filename="([^"]+)"', line)
                            if filename_match:
                                image_name = filename_match.group(1)
                        
                        if line == '' and i + 1 < len(lines):
                            field_value = '\r\n'.join(lines[i + 1:]).strip()
                            break
                    
                    if field_name == 'title':
                        title = field_value
                    elif field_name == 'date':
                        date = field_value
                    elif field_name == 'description':
                        description = field_value
                    elif field_name == 'image' and is_file:
                        image_data = field_value
            
            print(f"Parsed form data: title={title}, date={date}, description={description}, image_name={image_name}")
            
            # 필수 필드 검증
            if not all([title, date, description, image_data]):
                self.send_error_response(400, "모든 필드를 입력해주세요.")
                return
            
            # 이미지 저장
            image_id = str(int(datetime.datetime.now().timestamp() * 1000))
            image_extension = os.path.splitext(image_name or 'image.jpg')[1]
            image_filename = f"construction_{image_id}{image_extension}"
            
            # 업로드 디렉토리 생성
            upload_dir = os.path.join('static', 'uploads', 'construction')
            os.makedirs(upload_dir, exist_ok=True)
            
            image_path = os.path.join(upload_dir, image_filename)
            
            # 이미지 데이터 저장 (base64 디코딩)
            try:
                image_bytes = base64.b64decode(image_data)
                with open(image_path, 'wb') as f:
                    f.write(image_bytes)
                print(f"Image saved to {image_path}")
            except Exception as e:
                print(f"Error saving image: {e}")
                self.send_error_response(500, "이미지 저장 중 오류가 발생했습니다.")
                return
            
            # 게시물 데이터 생성
            post_data = {
                'id': image_id,
                'title': title,
                'date': date,
                'description': description,
                'imageUrl': f'/static/uploads/construction/{image_filename}',
                'createdAt': datetime.datetime.now().isoformat()
            }
            
            # 게시물 데이터 저장
            posts_dir = 'content/construction'
            os.makedirs(posts_dir, exist_ok=True)
            
            post_file_path = os.path.join(posts_dir, f"{image_id}.json")
            with open(post_file_path, 'w', encoding='utf-8') as f:
                json.dump(post_data, f, ensure_ascii=False, indent=2)
            
            print(f"Construction post saved: {post_data}")
            
            response = {
                'success': True,
                'message': '게시물이 성공적으로 등록되었습니다.',
                'post': post_data
            }
            
            self.send_json_response(200, response)
            
        except Exception as e:
            print(f"Error processing construction submission: {e}")
            self.send_error_response(500, f"서버 오류가 발생했습니다: {str(e)}")

    def handle_get_construction(self):
        try:
            print(f"Handling get-construction request: {self.path}")
            
            # 쿼리 파라미터 파싱
            parsed_url = urlparse(self.path)
            query_params = parse_qs(parsed_url.query)
            
            page = int(query_params.get('page', [1])[0])
            per_page = int(query_params.get('per_page', [10])[0])
            
            print(f"Page: {page}, Per page: {per_page}")
            
            posts = []
            posts_dir = 'content/construction'
            
            if os.path.exists(posts_dir):
                files = [f for f in os.listdir(posts_dir) if f.endswith('.json')]
                # 파일명 기준으로 최신순 정렬 (ID가 timestamp이므로)
                files.sort(key=lambda x: int(x.replace('.json', '')), reverse=True)
                
                for filename in files:
                    file_path = os.path.join(posts_dir, filename)
                    with open(file_path, 'r', encoding='utf-8') as f:
                        post = json.load(f)
                        posts.append(post)
            
            print(f"Found {len(posts)} construction posts")
            
            # 페이지네이션 처리
            start_index = (page - 1) * per_page
            end_index = start_index + per_page
            paginated_posts = posts[start_index:end_index]
            
            print(f"Returning {len(paginated_posts)} posts for page {page}")
            self.send_json_response(200, paginated_posts)
            
        except Exception as e:
            print(f"Error getting construction posts: {e}")
            self.send_error_response(500, f"서버 오류가 발생했습니다: {str(e)}")

    def handle_delete_construction(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            post_id = data.get('id')
            if not post_id:
                self.send_error_response(400, "게시물 ID가 필요합니다.")
                return
            
            print(f"Deleting construction post with ID: {post_id}")
            
            # 게시물 파일 경로
            posts_dir = 'content/construction'
            post_file_path = os.path.join(posts_dir, f"{post_id}.json")
            
            # 게시물 파일이 존재하는지 확인
            if not os.path.exists(post_file_path):
                self.send_error_response(404, "게시물을 찾을 수 없습니다.")
                return
            
            # 게시물 데이터 읽기 (이미지 경로 확인용)
            with open(post_file_path, 'r', encoding='utf-8') as f:
                post_data = json.load(f)
            
            # 게시물 파일 삭제
            os.unlink(post_file_path)
            print(f"Deleted post file: {post_file_path}")
            
            # 이미지 파일 삭제
            if post_data.get('imageUrl'):
                image_path = post_data['imageUrl'].lstrip('/')
                if os.path.exists(image_path):
                    os.unlink(image_path)
                    print(f"Deleted image file: {image_path}")
            
            response = {
                'success': True,
                'message': '게시물이 성공적으로 삭제되었습니다.'
            }
            
            self.send_json_response(200, response)
            
        except Exception as e:
            print(f"Error deleting construction post: {e}")
            self.send_error_response(500, f"서버 오류가 발생했습니다: {str(e)}")
    
    def send_json_response(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
    
    def send_error_response(self, status_code, message):
        self.send_json_response(status_code, {'error': message})
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.end_headers()

if __name__ == '__main__':
    server_address = ('', 8000)
    httpd = HTTPServer(server_address, EstimateHandler)
    print('테스트 서버가 시작되었습니다. http://localhost:8000 에서 접속하세요.')
    print('견적문의를 테스트하려면 견적문의 폼을 작성하고 제출해보세요.')
    print('시공사진 게시물 작성을 테스트하려면 로그인 후 글 작성 버튼을 클릭하세요.')
    httpd.serve_forever() 