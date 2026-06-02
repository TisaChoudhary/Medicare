const jwt = require('jsonwebtoken');

async function test() {
  try {
    const token = jwt.sign(
      { id: 'mock_user_a5z8mrj87' }, 
      'medicare_default_secret_please_change_in_production',
      { expiresIn: '30d' }
    );
    console.log('Generated token for Tisa:', token);
    
    // Call get reminders today
    const remRes = await fetch('http://localhost:5000/api/reminders/today?date=2026-06-01', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const remData = await remRes.json();
    console.log('Reminders HTTP status:', remRes.status);
    console.log('Reminders response:', JSON.stringify(remData, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
