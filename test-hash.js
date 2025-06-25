// 간단한 bcrypt 해시 테스트
const crypto = require('crypto');

// 비밀번호: rlatjsgh1!
const password = 'rlatjsgh1!';

// 간단한 해시 생성 (실제 bcrypt 대신 테스트용)
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

console.log('Password:', password);
console.log('Salt:', salt);
console.log('Hash:', hash);

// 검증 테스트
const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
console.log('Verification:', hash === testHash); 