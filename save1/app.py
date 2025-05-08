from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///estimates.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class Admin(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

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
        
        # 관리자 계정 생성
        admin = Admin.query.filter_by(username='admin').first()
        if not admin:
            admin = Admin(username='admin')
            admin.set_password('ehdusdl1!')
            db.session.add(admin)
            db.session.commit()
            print("관리자 계정이 생성되었습니다.")
        else:
            admin.set_password('ehdusdl1!')
            db.session.commit()
            print("관리자 계정이 업데이트되었습니다.")
        
        print("데이터베이스가 성공적으로 초기화되었습니다.")

init_db()

@app.route('/')
def index():
    return render_template('index.html')

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
    
    # 로그인하지 않은 경우 이름과 연락처를 마스킹
    if not session.get('admin_logged_in'):
        for estimate in estimates.items:
            estimate.name = mask_name(estimate.name)
            estimate.phone = mask_phone(estimate.phone)
    
    return render_template('board.html', estimates=estimates)

@app.route('/view/<int:id>')
def view(id):
    estimate = Estimate.query.get_or_404(id)
    
    # 로그인하지 않은 경우 이름과 연락처를 마스킹
    if not session.get('admin_logged_in'):
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

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        admin = Admin.query.filter_by(username=username).first()
        
        if admin and admin.check_password(password):
            session['admin_logged_in'] = True
            flash('로그인되었습니다.', 'success')
            return redirect(url_for('board'))
        else:
            flash('아이디 또는 비밀번호가 올바르지 않습니다.', 'error')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('admin_logged_in', None)
    flash('로그아웃되었습니다.', 'success')
    return redirect(url_for('board'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True) 