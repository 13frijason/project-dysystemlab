const bcrypt = require('bcryptjs');

const password = 'rlatjsgh1!';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) {
        console.error('Error generating hash:', err);
    } else {
        console.log('Password:', password);
        console.log('Hash:', hash);
        
        // 해시 검증 테스트
        bcrypt.compare(password, hash, function(err, result) {
            if (err) {
                console.error('Error comparing:', err);
            } else {
                console.log('Hash verification:', result);
            }
        });
    }
}); 