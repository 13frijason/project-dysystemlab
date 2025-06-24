from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
from werkzeug.utils import secure_filename
from models import db, Construction

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# SQLAlchemy 초기화
db = SQLAlchemy(app)

# Construction 모델 정의
class Construction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    image_path = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

# 데이터베이스 초기화
with app.app_context():
    db.create_all()

class Estimate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(120))
    address = db.Column(db.String(200), nullable=False)
    service_type = db.Column(db.String(50), nullable=False)
    message = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='대기중')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'phone': self.phone,
            'email': self.email,
            'address': self.address,
            'service_type': self.service_type,
            'message': self.message,
            'status': self.status,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

def init_db():
    db_path = os.path.join(app.instance_path, 'estimates.db')
    
    if not os.path.exists(app.instance_path):
        os.makedirs(app.instance_path)
    
    with app.app_context():
        db.create_all()
        
        print("데이터베이스가 성공적으로 초기화되었습니다.")

init_db()

@app.route('/')
def index():
    # 최신 시공사진 6개 가져오기
    latest_construction = Construction.query.order_by(Construction.created_at.desc()).limit(6).all()
    return render_template('index.html', latest_construction=latest_construction)

@app.route('/submit_estimate', methods=['POST'])
def submit_estimate():
    try:
        data = request.form
        
        # 필수 필드 확인
        required_fields = ['name', 'phone', 'address', 'service_type', 'message']
        for field in required_fields:
            if not data.get(field):
                flash(f'{field} 필드는 필수입니다.', 'error')
                return redirect(url_for('index', _anchor='estimate'))

        new_estimate = Estimate(
            name=data['name'],
            phone=data['phone'],
            email=data.get('email', ''),
            address=data['address'],
            service_type=data['service_type'],
            message=data['message'],
            status='대기중'
        )

        db.session.add(new_estimate)
        db.session.commit()

        flash('견적문의가 성공적으로 등록되었습니다.', 'success')
        return redirect(url_for('board'))

    except Exception as e:
        db.session.rollback()
        flash(f'견적문의 등록 중 오류가 발생했습니다: {str(e)}', 'error')
        return redirect(url_for('index', _anchor='estimate'))

def mask_name(name):
    if len(name) <= 1:
        return name
    return name[0] + "****" + name[-1]

def mask_phone(phone):
    parts = phone.split('-')
    if len(parts) != 3:
        return phone
    return f"{parts[0]}-****-{parts[2]}"

@app.route('/board')
def board():
    page = request.args.get('page', 1, type=int)
    estimates = Estimate.query.order_by(Estimate.created_at.desc()).paginate(page=page, per_page=10)
    
    # Netlify Identity 토큰을 확인하여 로그인 상태 체크
    # 프론트엔드에서 처리하므로 여기서는 항상 마스킹 처리
    for estimate in estimates.items:
        estimate.name = mask_name(estimate.name)
        estimate.phone = mask_phone(estimate.phone)
    
    return render_template('board.html', estimates=estimates)

@app.route('/view/<int:id>')
def view(id):
    estimate = Estimate.query.get_or_404(id)
    
    # Netlify Identity 토큰을 확인하여 로그인 상태 체크
    # 프론트엔드에서 처리하므로 여기서는 항상 마스킹 처리
    estimate.name = mask_name(estimate.name)
    estimate.phone = mask_phone(estimate.phone)
    
    return render_template('view.html', estimate=estimate)

@app.route('/api/estimates', methods=['GET'])
def get_estimates():
    estimates = Estimate.query.order_by(Estimate.created_at.desc()).all()
    return jsonify([estimate.to_dict() for estimate in estimates])

@app.route('/api/estimates/<int:id>', methods=['GET'])
def get_estimate(id):
    estimate = Estimate.query.get_or_404(id)
    return jsonify(estimate.to_dict())

@app.route('/api/estimates/<int:id>', methods=['DELETE'])
def delete_estimate(id):
    try:
        estimate = Estimate.query.get_or_404(id)
        db.session.delete(estimate)
        db.session.commit()
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/construction')
def construction_board():
    posts = Construction.query.order_by(Construction.created_at.desc()).all()
    return render_template('construction.html', posts=posts)

@app.route('/construction/new', methods=['GET', 'POST'])
def new_construction():
    if request.method == 'POST':
        title = request.form['title']
        content = request.form['content']
        image = request.files.get('image')
        
        image_path = None
        if image and image.filename:
            filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{image.filename}"
            image_path = os.path.join('uploads', filename)
            image.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        
        post = Construction(title=title, content=content, image_path=image_path)
        db.session.add(post)
        db.session.commit()
        
        flash('게시글이 성공적으로 작성되었습니다.', 'success')
        return redirect(url_for('construction_board'))
    
    return render_template('construction_form.html')

@app.route('/construction/<int:id>/edit', methods=['GET', 'POST'])
def edit_construction(id):
    post = Construction.query.get_or_404(id)
    
    if request.method == 'POST':
        post.title = request.form['title']
        post.content = request.form['content']
        
        image = request.files.get('image')
        if image and image.filename:
            # 기존 이미지 삭제
            if post.image_path:
                old_image_path = os.path.join(app.config['UPLOAD_FOLDER'], os.path.basename(post.image_path))
                if os.path.exists(old_image_path):
                    os.remove(old_image_path)
            
            # 새 이미지 저장
            filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{image.filename}"
            post.image_path = os.path.join('uploads', filename)
            image.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        
        db.session.commit()
        flash('게시글이 성공적으로 수정되었습니다.', 'success')
        return redirect(url_for('construction_board'))
    
    return render_template('construction_edit.html', post=post)

@app.route('/construction/<int:id>/delete')
def delete_construction(id):
    post = Construction.query.get_or_404(id)
    
    # 이미지 파일 삭제
    if post.image_path:
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], os.path.basename(post.image_path))
        if os.path.exists(image_path):
            os.remove(image_path)
    
    db.session.delete(post)
    db.session.commit()
    flash('게시글이 성공적으로 삭제되었습니다.', 'success')
    return redirect(url_for('construction_board'))

if __name__ == '__main__':
    # uploads 폴더가 없으면 생성
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])
    app.run(host='0.0.0.0', port=8080, debug=True) 