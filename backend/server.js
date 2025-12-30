/**
 * ============================================================================
 * MEDICAL AI SERVER - Backend API
 * ============================================================================
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const pool = require('./config/database');

// ==================== SETUP ====================

// Create uploads directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
const recordingsDir = path.join(uploadsDir, 'recordings');

console.log(`📁 Uploads dir: ${uploadsDir}`);
console.log(`📁 Recordings dir: ${recordingsDir}`);

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`✅ Created uploads directory`);
}

if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
  console.log(`✅ Created recordings directory`);
}

// ==================== MIDDLEWARE ====================

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:8000',
    'http://localhost:8080',
    'https://medical-ai.it',
    'https://app.medical-ai.it',
    'https://app1-0-m2yf.onrender.com'
  ],
  credentials: true
}));

// Increase JSON payload limit for base64 audio data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==================== STATIC FILE SERVING ====================
app.use('/api/uploads/recordings', express.static(recordingsDir, {
  dotfiles: 'ignore',
  index: false,
  setHeaders: (res, filepath, stat) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', 'audio/webm');
    res.set('Content-Disposition', 'inline');
    res.set('Cache-Control', 'public, max-age=31536000');
    console.log(`📡 Serving file: ${filepath}`);
  }
}));

app.use('/api/uploads', express.static(recordingsDir, {
  setHeaders: (res, filepath, stat) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', 'audio/webm');
    res.set('Content-Disposition', 'inline');
    res.set('Cache-Control', 'public, max-age=31536000');
  }
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n📨 ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0 && req.path !== '/api/recordings') {
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  } else if (req.body && req.path === '/api/recordings') {
    const bodyLog = { ...req.body };
    if (bodyLog.audio_data) {
      bodyLog.audio_data = `<${bodyLog.audio_data.length} bytes of base64 audio>`;
    }
    console.log('📦 Body:', JSON.stringify(bodyLog, null, 2));
  }
  next();
});

// ==================== UTILITY FUNCTIONS ====================

function saveAudioFile(base64Data, filename) {
  try {
    if (!base64Data) {
      console.warn('⚠️ No audio data provided');
      return false;
    }

    let audioData = base64Data;
    if (base64Data.includes('base64,')) {
      audioData = base64Data.split('base64,')[1];
    }

    console.log(`📊 Audio data length: ${audioData.length} characters (base64)`);

    const filepath = path.join(recordingsDir, filename);
    console.log(`📝 Saving to: ${filepath}`);

    const buffer = Buffer.from(audioData, 'base64');
    console.log(`📊 Buffer size: ${buffer.length} bytes`);

    fs.writeFileSync(filepath, buffer);
    
    const stats = fs.statSync(filepath);
    console.log(`✅ Audio file saved: ${filename} (${(stats.size / 1024).toFixed(2)} KB)`);
    
    return true;
  } catch (error) {
    console.error('❌ Error saving audio file:', error.message);
    console.error('❌ Stack:', error.stack);
    throw error;
  }
}

function deleteAudioFile(filename) {
  try {
    const filepath = path.join(recordingsDir, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      console.log(`🗑️ Audio file deleted: ${filename}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error deleting audio file:', error.message);
    return false;
  }
}

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uploadsDir: uploadsDir,
    recordingsDir: recordingsDir
  });
});

app.get('/api/uploads/test', (req, res) => {
  try {
    const files = fs.readdirSync(recordingsDir);
    res.json({
      message: 'Static file serving is working',
      recordingsDir: recordingsDir,
      files: files,
      totalFiles: files.length
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      recordingsDir: recordingsDir
    });
  }
});

// ==================== AUTH ROUTES ====================

app.post('/api/auth/login', async (req, res) => {
  let connection;
  try {
    const { email, password } = req.body;
    
    console.log(`\n🔐 LOGIN ATTEMPT`);
    console.log(`📧 Email: ${email}`);
    
    if (!email || !password) {
      console.log(`❌ Missing required fields`);
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: email, password' 
      });
    }

    connection = await pool.getConnection();
    
    console.log(`\n🔍 Checking ADMINS table...`);
    const [adminResults] = await connection.query(
      'SELECT id, name, email, role, status FROM admins WHERE email = ? AND password = ? AND status = "active"',
      [email.toLowerCase(), password]
    );
    
    if (adminResults && adminResults.length > 0) {
      const adminData = adminResults[0];
      console.log(`✅ ADMIN FOUND:`, adminData);
      
      connection.release();
      
      return res.status(200).json({ 
        success: true, 
        message: 'Admin login successful',
        role: 'admin',
        data: adminData
      });
    }
    
    console.log(`❌ No admin found with these credentials`);
    
    console.log(`\n🔍 Checking USERS table...`);
    const [userResults] = await connection.query(
      `SELECT u.id, u.email, u.name, u.role, u.status, u.studio_id, s.name as studio_name 
       FROM users u 
       JOIN studios s ON u.studio_id = s.id 
       WHERE u.email = ? AND u.password = ? AND u.status = "active"`,
      [email.toLowerCase(), password]
    );
    
    if (userResults && userResults.length > 0) {
      const userData = userResults[0];
      console.log(`✅ STUDIO USER FOUND:`, userData);
      
      connection.release();
      
      return res.status(200).json({ 
        success: true, 
        message: 'Studio user login successful',
        role: 'studio',
        data: userData
      });
    }
    
    console.log(`❌ No studio user found with these credentials`);
    connection.release();
    
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid email or password' 
    });

  } catch (error) {
    console.error('\n🔥 LOGIN ERROR:', error);
    if (connection) connection.release();
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error during login' 
    });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  let connection;
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }

    connection = await pool.getConnection();
    
    const [adminResults] = await connection.query(
      'SELECT id, email FROM admins WHERE email = ? AND status = "active"',
      [email.toLowerCase()]
    );
    
    if (adminResults && adminResults.length > 0) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000);
      const resetId = uuidv4();
      
      await connection.query(
        'INSERT INTO password_resets (id, user_id, user_type, token, expires_at) VALUES (?, ?, ?, ?, ?)',
        [resetId, adminResults[0].id, 'admin', resetToken, expiresAt]
      );
      
      connection.release();
      
      return res.json({ 
        success: true, 
        message: 'Password reset link sent to email',
        resetToken: resetToken
      });
    }
    
    const [userResults] = await connection.query(
      'SELECT id, email FROM users WHERE email = ? AND status = "active"',
      [email.toLowerCase()]
    );
    
    if (userResults && userResults.length > 0) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000);
      const resetId = uuidv4();
      
      await connection.query(
        'INSERT INTO password_resets (id, user_id, user_type, token, expires_at) VALUES (?, ?, ?, ?, ?)',
        [resetId, userResults[0].id, 'user', resetToken, expiresAt]
      );
      
      connection.release();
      
      return res.json({ 
        success: true, 
        message: 'Password reset link sent to email',
        resetToken: resetToken
      });
    }
    
    connection.release();
    
    return res.json({ 
      success: true, 
      message: 'If email exists, password reset link has been sent' 
    });

  } catch (error) {
    console.error('POST /api/auth/forgot-password error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  let connection;
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Token and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 6 characters' 
      });
    }

    connection = await pool.getConnection();
    
    const [resetResults] = await connection.query(
      'SELECT user_id, user_type FROM password_resets WHERE token = ? AND expires_at > NOW()',
      [token]
    );
    
    if (!resetResults || resetResults.length === 0) {
      connection.release();
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired reset token' 
      });
    }

    const { user_id, user_type } = resetResults[0];
    
    if (user_type === 'admin') {
      await connection.query(
        'UPDATE admins SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newPassword, user_id]
      );
    } else if (user_type === 'user') {
      await connection.query(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newPassword, user_id]
      );
    }
    
    await connection.query('DELETE FROM password_resets WHERE token = ?', [token]);
    
    connection.release();
    
    return res.json({ 
      success: true, 
      message: 'Password reset successfully' 
    });

  } catch (error) {
    console.error('POST /api/auth/reset-password error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/verify-session', async (req, res) => {
  let connection;
  try {
    const { userId, userType } = req.body;
    
    if (!userId || !userType) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId and userType are required' 
      });
    }

    connection = await pool.getConnection();
    
    let userResults;
    if (userType === 'admin') {
      [userResults] = await connection.query(
        'SELECT id, name, email, role, status FROM admins WHERE id = ? AND status = "active"',
        [userId]
      );
    } else if (userType === 'studio') {
      [userResults] = await connection.query(
        'SELECT id, email, name, role, status, studio_id FROM users WHERE id = ? AND status = "active"',
        [userId]
      );
    }
    
    connection.release();
    
    if (!userResults || userResults.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'Session invalid or user not active' 
      });
    }
    
    return res.json({ 
      success: true, 
      data: userResults[0]
    });

  } catch (error) {
    console.error('POST /api/auth/verify-session error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    console.log('👋 User logout');
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('POST /api/auth/logout error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ADMIN ROUTES ====================

app.get('/api/admins', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [admins] = await connection.query(
      'SELECT id, name, email, role, status, created_at FROM admins WHERE status != "deleted" ORDER BY created_at DESC'
    );
    connection.release();
    res.json({ success: true, data: admins });
  } catch (error) {
    console.error('GET /api/admins error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admins/:id', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [adminResults] = await connection.query(
      'SELECT id, name, email, role, status, created_at FROM admins WHERE id = ? AND status != "deleted"',
      [req.params.id]
    );
    connection.release();
    
    if (!adminResults || adminResults.length === 0) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }
    res.json({ success: true, data: adminResults[0] });
  } catch (error) {
    console.error('GET /api/admins/:id error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admins', async (req, res) => {
  let connection;
  try {
    const { name, email, password, role = 'admin', status = 'active' } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: name, email, password' 
      });
    }

    const id = uuidv4();
    connection = await pool.getConnection();
    
    await connection.query(
      'INSERT INTO admins (id, name, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, email.toLowerCase(), password, role, status]
    );
    
    connection.release();
    res.status(201).json({ 
      success: true, 
      message: 'Admin created successfully',
      data: { id, name, email, role, status }
    });
  } catch (error) {
    console.error('POST /api/admins error:', error);
    if (connection) connection.release();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'Email already exists' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admins/:id', async (req, res) => {
  let connection;
  try {
    const { name, role, status } = req.body;
    
    if (!name || !role) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: name, role' 
      });
    }

    connection = await pool.getConnection();
    
    const updateStatus = status || 'active';
    await connection.query(
      'UPDATE admins SET name = ?, role = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, role, updateStatus, req.params.id]
    );
    
    connection.release();
    res.json({ 
      success: true, 
      message: 'Admin updated successfully' 
    });
  } catch (error) {
    console.error('PUT /api/admins/:id error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admins/:id', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    await connection.query(
      'UPDATE admins SET status = "deleted", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.params.id]
    );
    
    connection.release();
    res.json({ 
      success: true, 
      message: 'Admin deleted successfully' 
    });
  } catch (error) {
    console.error('DELETE /api/admins/:id error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admins/:id/reset-password', async (req, res) => {
  let connection;
  try {
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: newPassword' 
      });
    }

    connection = await pool.getConnection();
    
    await connection.query(
      'UPDATE admins SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPassword, req.params.id]
    );
    
    connection.release();
    res.json({ 
      success: true, 
      message: 'Password reset successfully' 
    });
  } catch (error) {
    console.error('POST /api/admins/:id/reset-password error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admins/:id/change-password', async (req, res) => {
  let connection;
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: oldPassword, newPassword' 
      });
    }

    connection = await pool.getConnection();
    
    const [adminResults] = await connection.query(
      'SELECT password FROM admins WHERE id = ?',
      [req.params.id]
    );
    
    if (!adminResults || adminResults.length === 0 || adminResults[0].password !== oldPassword) {
      connection.release();
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid current password' 
      });
    }
    
    await connection.query(
      'UPDATE admins SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPassword, req.params.id]
    );
    
    connection.release();
    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    console.error('POST /api/admins/:id/change-password error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== STUDIOS ROUTES ====================

app.get('/api/studios', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [studios] = await connection.query(
      'SELECT id, name, email, phone, status, created_at FROM studios WHERE status != "deleted" ORDER BY created_at DESC'
    );
    connection.release();
    res.json({ success: true, data: studios });
  } catch (error) {
    console.error('GET /api/studios error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/studios/:id', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [studioResults] = await connection.query(
      'SELECT id, name, email, phone, status, created_at FROM studios WHERE id = ? AND status != "deleted"',
      [req.params.id]
    );
    connection.release();
    
    if (!studioResults || studioResults.length === 0) {
      return res.status(404).json({ success: false, error: 'Studio not found' });
    }
    res.json({ success: true, data: studioResults[0] });
  } catch (error) {
    console.error('GET /api/studios/:id error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/studios', async (req, res) => {
  let connection;
  try {
    const { name, email, phone, status = 'attivo' } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: name, email' 
      });
    }

    const id = uuidv4();
    connection = await pool.getConnection();
    
    await connection.query(
      'INSERT INTO studios (id, name, email, phone, status) VALUES (?, ?, ?, ?, ?)',
      [id, name, email.toLowerCase(), phone || null, status]
    );
    
    connection.release();
    res.status(201).json({ 
      success: true, 
      message: 'Studio created successfully',
      data: { id, name, email, phone, status }
    });
  } catch (error) {
    console.error('POST /api/studios error:', error);
    if (connection) connection.release();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'Email already exists' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/studios/:id', async (req, res) => {
  let connection;
  try {
    const { name, email, phone, status } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: name, email' 
      });
    }

    connection = await pool.getConnection();
    
    const updateStatus = status || 'attivo';
    await connection.query(
      'UPDATE studios SET name = ?, email = ?, phone = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, email.toLowerCase(), phone || null, updateStatus, req.params.id]
    );
    
    connection.release();
    res.json({ 
      success: true, 
      message: 'Studio updated successfully' 
    });
  } catch (error) {
    console.error('PUT /api/studios/:id error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/studios/:id', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    await connection.query(
      'UPDATE studios SET status = "deleted", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.params.id]
    );
    
    connection.release();
    res.json({ 
      success: true, 
      message: 'Studio deleted successfully' 
    });
  } catch (error) {
    console.error('DELETE /api/studios/:id error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== USERS ROUTES ====================

app.get('/api/users', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [users] = await connection.query(
      'SELECT id, email, name, studio_id, role, status, created_at FROM users WHERE status != "deleted" ORDER BY created_at DESC'
    );
    connection.release();
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('GET /api/users error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [userResults] = await connection.query(
      'SELECT id, email, name, studio_id, role, status, created_at FROM users WHERE id = ? AND status != "deleted"',
      [req.params.id]
    );
    connection.release();
    
    if (!userResults || userResults.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: userResults[0] });
  } catch (error) {
    console.error('GET /api/users/:id error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  let connection;
  try {
    const { email, password, name, studio_id, role = 'user', status = 'active' } = req.body;
    
    if (!email || !password || !studio_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: email, password, studio_id' 
      });
    }

    const id = uuidv4();
    connection = await pool.getConnection();
    
    await connection.query(
      'INSERT INTO users (id, email, password, name, studio_id, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, email.toLowerCase(), password, name || null, studio_id, role, status]
    );
    
    connection.release();
    res.status(201).json({ 
      success: true, 
      message: 'User created successfully',
      data: { id, email, name, studio_id, role, status }
    });
  } catch (error) {
    console.error('POST /api/users error:', error);
    if (connection) connection.release();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'Email already exists' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  let connection;
  try {
    const { email, name, role, status } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: email' 
      });
    }

    connection = await pool.getConnection();
    
    const updateStatus = status || 'active';
    await connection.query(
      'UPDATE users SET email = ?, name = ?, role = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [email.toLowerCase(), name || null, role || 'user', updateStatus, req.params.id]
    );
    
    connection.release();
    res.json({ 
      success: true, 
      message: 'User updated successfully' 
    });
  } catch (error) {
    console.error('PUT /api/users/:id error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    await connection.query(
      'UPDATE users SET status = "deleted", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.params.id]
    );
    
    connection.release();
    res.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('DELETE /api/users/:id error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PATIENTS ROUTES ====================

app.get('/api/patients', async (req, res) => {
  let connection;
  try {
    const studioId = req.query.studio_id;
    if (!studioId) {
      return res.status(400).json({ success: false, error: 'studio_id query parameter required' });
    }

    connection = await pool.getConnection();
    const [patients] = await connection.query(
      'SELECT id, studio_id, first_name, last_name, email, phone, date_of_birth, notes, status, created_at, updated_at FROM patients WHERE studio_id = ? AND status != "deleted" ORDER BY created_at DESC',
      [studioId]
    );
    connection.release();
    res.json({ success: true, data: patients });
  } catch (error) {
    console.error('GET /api/patients error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/patients/:id', async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const studioId = req.query.studio_id;

    if (!studioId) {
      return res.status(400).json({ success: false, error: 'studio_id query parameter required' });
    }

    connection = await pool.getConnection();
    const [patientResults] = await connection.query(
      'SELECT id, studio_id, first_name, last_name, email, phone, date_of_birth, notes, status, created_at, updated_at FROM patients WHERE id = ? AND studio_id = ?',
      [id, studioId]
    );
    connection.release();

    if (!patientResults || patientResults.length === 0) {
      return res.status(404).json({ success: false, error: 'Patient not found' });
    }

    res.json({ success: true, data: patientResults[0] });
  } catch (error) {
    console.error('GET /api/patients/:id error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/patients', async (req, res) => {
  let connection;
  try {
    const { studio_id, first_name, last_name, email, phone, date_of_birth, notes } = req.body;

    if (!studio_id || !first_name || !last_name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: studio_id, first_name, last_name' 
      });
    }

    const id = uuidv4();
    connection = await pool.getConnection();

    await connection.query(
      `INSERT INTO patients (id, studio_id, first_name, last_name, email, phone, date_of_birth, notes, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'attivo')`,
      [id, studio_id, first_name, last_name, email || null, phone || null, date_of_birth || null, notes || null]
    );

    const [newPatientResults] = await connection.query('SELECT * FROM patients WHERE id = ?', [id]);
    connection.release();

    res.status(201).json({ 
      success: true, 
      message: 'Patient created successfully',
      data: newPatientResults[0] 
    });
  } catch (error) {
    console.error('POST /api/patients error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/patients/:id', async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { studio_id, first_name, last_name, email, phone, date_of_birth, notes } = req.body;

    if (!studio_id || !first_name || !last_name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: studio_id, first_name, last_name' 
      });
    }

    connection = await pool.getConnection();

    await connection.query(
      `UPDATE patients SET first_name = ?, last_name = ?, email = ?, phone = ?, date_of_birth = ?, notes = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND studio_id = ?`,
      [first_name, last_name, email || null, phone || null, date_of_birth || null, notes || null, id, studio_id]
    );

    const [updatedPatientResults] = await connection.query('SELECT * FROM patients WHERE id = ?', [id]);
    connection.release();

    res.json({ 
      success: true, 
      message: 'Patient updated successfully',
      data: updatedPatientResults[0] 
    });
  } catch (error) {
    console.error('PUT /api/patients/:id error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/patients/:id', async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { studio_id } = req.body;

    if (!studio_id) {
      return res.status(400).json({ success: false, error: 'studio_id is required' });
    }

    connection = await pool.getConnection();
    await connection.query(
      'UPDATE patients SET status = "deleted", updated_at = CURRENT_TIMESTAMP WHERE id = ? AND studio_id = ?',
      [id, studio_id]
    );
    connection.release();

    res.json({ success: true, message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/patients/:id error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== RECORDINGS ROUTES ====================

app.get('/api/recordings', async (req, res) => {
  let connection;
  try {
    const studioId = req.query.studio_id;
    if (!studioId) {
      return res.status(400).json({ success: false, error: 'studio_id query parameter required' });
    }

    connection = await pool.getConnection();
    const [recordings] = await connection.query(
      `SELECT r.id, r.studio_id, r.patient_id, r.user_id, r.duration, r.visit_type, r.doctor_name, r.audio_url, r.transcript, r.referto_data, r.odontogramma_data, r.processing_status, r.status, r.created_at, r.updated_at,
              p.first_name, p.last_name, p.email as patient_email
       FROM recordings r 
       LEFT JOIN patients p ON r.patient_id = p.id 
       WHERE r.studio_id = ? AND r.status != "deleted" 
       ORDER BY r.created_at DESC`,
      [studioId]
    );
    connection.release();

    res.json({ success: true, data: recordings });
  } catch (error) {
    console.error('GET /api/recordings error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/recordings/patient/:patientId', async (req, res) => {
  let connection;
  try {
    const { patientId } = req.params;
    const studioId = req.query.studio_id;

    if (!studioId) {
      return res.status(400).json({ success: false, error: 'studio_id query parameter required' });
    }

    connection = await pool.getConnection();
    const [recordings] = await connection.query(
      `SELECT r.id, r.studio_id, r.patient_id, r.user_id, r.duration, r.visit_type, r.doctor_name, r.audio_url, r.transcript, r.referto_data, r.odontogramma_data, r.processing_status, r.status, r.created_at, r.updated_at,
              p.first_name, p.last_name
       FROM recordings r 
       LEFT JOIN patients p ON r.patient_id = p.id 
       WHERE r.patient_id = ? AND r.studio_id = ? AND r.status != "deleted"
       ORDER BY r.created_at DESC`,
      [patientId, studioId]
    );
    connection.release();

    res.json({ success: true, data: recordings });
  } catch (error) {
    console.error('GET /api/recordings/patient/:patientId error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/recordings/:id', async (req, res) => {
  let connection;
  try {
    const { id } = req.params;

    connection = await pool.getConnection();
    const [recordingResults] = await connection.query(
      `SELECT r.id, r.studio_id, r.patient_id, r.user_id, r.duration, r.visit_type, r.doctor_name, r.audio_url, r.transcript, r.referto_data, r.odontogramma_data, r.processing_status, r.status, r.created_at, r.updated_at,
              p.first_name, p.last_name, p.email as patient_email
       FROM recordings r 
       LEFT JOIN patients p ON r.patient_id = p.id 
       WHERE r.id = ?`,
      [id]
    );

    connection.release();

    if (!recordingResults || recordingResults.length === 0) {
      return res.status(404).json({ success: false, error: 'Recording not found' });
    }

    const recording = recordingResults[0];
    
    const referto = recording.referto_data ? JSON.parse(recording.referto_data) : null;
    const odontogramma = recording.odontogramma_data ? JSON.parse(recording.odontogramma_data) : null;

    res.json({ 
      success: true, 
      data: {
        ...recording,
        referto,
        odontogramma
      }
    });
  } catch (error) {
    console.error('GET /api/recordings/:id error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/recordings', async (req, res) => {
  let connection;
  try {
    const { studio_id, patient_id, user_id, duration, visit_type, doctor_name, audio_data, transcript } = req.body;

    if (!studio_id || !patient_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: studio_id, patient_id' 
      });
    }

    const id = uuidv4();
    const timestamp = Date.now();
    const audioFilename = `recording_${id}_${timestamp}.webm`;
    
    let audioUrl = null;

    if (audio_data) {
      try {
        saveAudioFile(audio_data, audioFilename);
        audioUrl = `/api/uploads/recordings/${audioFilename}`;
        console.log(`✅ Audio file saved with URL: ${audioUrl}`);
      } catch (error) {
        console.error('❌ Failed to save audio file:', error.message);
      }
    }

    connection = await pool.getConnection();

    await connection.query(
      `INSERT INTO recordings (id, studio_id, patient_id, user_id, duration, visit_type, doctor_name, audio_url, transcript, processing_status, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'completed')`,
      [id, studio_id, patient_id, user_id || null, duration || 0, visit_type || null, doctor_name || null, audioUrl, transcript || null]
    );

    const [newRecordingResults] = await connection.query('SELECT * FROM recordings WHERE id = ?', [id]);
    connection.release();

    console.log(`✅ Recording created: ${id} (visit_type: ${visit_type}, doctor: ${doctor_name || 'N/A'})`);

    res.status(201).json({ 
      success: true, 
      message: 'Recording created successfully',
      data: newRecordingResults[0] 
    });
  } catch (error) {
    console.error('POST /api/recordings error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ POST /api/recordings/:id/process - AGGIORNATO CON LOGGING DETTAGLIATO
app.post('/api/recordings/:id/process', async (req, res) => {
  let connection;
  try {
    const recordingId = req.params.id;
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🤖 PROCESSING RECORDING: ${recordingId}`);
    console.log(`${'='.repeat(80)}`);

    console.log('📍 Step 0: Getting database connection...');
    connection = await pool.getConnection();
    console.log('✅ Database connection established');
    
    console.log('📍 Step 1: Fetching recording from database...');
    const [recordings] = await connection.query(
      'SELECT id, studio_id, patient_id, visit_type, doctor_name, audio_url FROM recordings WHERE id = ? AND status != "deleted"',
      [recordingId]
    );
    
    if (!recordings || recordings.length === 0) {
      connection.release();
      console.error('❌ Recording not found in database');
      return res.status(404).json({ success: false, error: 'Recording not found' });
    }

    const recording = recordings[0];
    console.log('✅ Recording found:', {
      id: recording.id,
      visitType: recording.visit_type,
      doctorName: recording.doctor_name,
      audioUrl: recording.audio_url
    });

    console.log('📍 Step 2: Verifying audio file exists...');
    const audioFilePath = path.join(recordingsDir, path.basename(recording.audio_url));
    console.log('📂 Expected audio path:', audioFilePath);
    console.log('📂 Recording dir exists:', fs.existsSync(recordingsDir));
    console.log('📂 Audio file exists:', fs.existsSync(audioFilePath));
    
    if (!fs.existsSync(audioFilePath)) {
      connection.release();
      const dirContents = fs.readdirSync(recordingsDir).slice(0, 5);
      console.error('❌ Audio file not found at:', audioFilePath);
      console.error('📂 Recent files in recordings dir:', dirContents);
      return res.status(404).json({ 
        success: false, 
        error: 'Audio file not found',
        details: { audioFilePath, recentFiles: dirContents }
      });
    }
    console.log('✅ Audio file verified');

    console.log('📍 Step 3: Loading OpenAI service...');
    let openaiService;
    try {
      openaiService = require('./services/openai-service');
      console.log('✅ OpenAI service loaded');
    } catch (e) {
      connection.release();
      console.error('❌ Failed to load OpenAI service:', e.message);
      return res.status(500).json({
        success: false,
        error: 'OpenAI service load failed',
        message: e.message
      });
    }
    
    console.log('📍 Step 4: Transcribing audio with Whisper...');
    console.log('🎤 Audio file:', audioFilePath);
    let transcript;
    try {
      transcript = await openaiService.transcribeAudio(audioFilePath);
      console.log('✅ Transcription successful');
      console.log('📝 Transcript length:', transcript.length, 'chars');
      console.log('📝 First 100 chars:', transcript.substring(0, 100));
    } catch (e) {
      connection.release();
      console.error('❌ Transcription failed:', e.message);
      console.error('❌ Stack:', e.stack);
      return res.status(500).json({
        success: false,
        error: 'Transcription failed',
        message: e.message
      });
    }

    console.log('📍 Step 5: Generating referto...');
    console.log('📋 Visit type:', recording.visit_type);
    console.log('👨‍⚕️ Doctor name:', recording.doctor_name);
    let refertoResult;
    try {
      refertoResult = await openaiService.generateReferto(transcript, recording.visit_type, recording.doctor_name);
      console.log('✅ Referto generation successful');
      console.log('📋 Referto keys:', Object.keys(refertoResult).join(', '));
    } catch (e) {
      connection.release();
      console.error('❌ Referto generation failed:', e.message);
      console.error('❌ Stack:', e.stack);
      return res.status(500).json({
        success: false,
        error: 'Referto generation failed',
        message: e.message
      });
    }

    console.log('📍 Step 6: Analyzing odontogramma...');
    let odontogrammaData;
    try {
      odontogrammaData = await openaiService.analyzeOdontogrammaData(refertoResult.referto, recording.visit_type);
      console.log('✅ Odontogramma analysis successful');
      console.log('🦷 Odontogramma keys:', Object.keys(odontogrammaData).join(', '));
    } catch (e) {
      connection.release();
      console.error('❌ Odontogramma analysis failed:', e.message);
      console.error('❌ Stack:', e.stack);
      return res.status(500).json({
        success: false,
        error: 'Odontogramma analysis failed',
        message: e.message
      });
    }

    console.log('📍 Step 7: Updating database with results...');
    const refertoData = JSON.stringify(refertoResult.referto);
    const odontogrammaDataStr = JSON.stringify(odontogrammaData);
    
    try {
      await connection.query(
        `UPDATE recordings SET 
          transcript = ?,
          referto_data = ?,
          odontogramma_data = ?,
          processing_status = 'completed'
        WHERE id = ?`,
        [transcript, refertoData, odontogrammaDataStr, recordingId]
      );
      console.log('✅ Database update successful');
    } catch (e) {
      connection.release();
      console.error('❌ Database update failed:', e.message);
      console.error('❌ Stack:', e.stack);
      return res.status(500).json({
        success: false,
        error: 'Database update failed',
        message: e.message
      });
    }

    connection.release();

    console.log(`${'='.repeat(80)}`);
    console.log(`✅ PROCESSING COMPLETED FOR ${recordingId}`);
    console.log(`${'='.repeat(80)}\n`);

    res.json({
      success: true,
      recordingId: recordingId,
      doctorName: recording.doctor_name || null,
      transcript: transcript,
      referto: refertoResult.referto,
      odontogramma: odontogrammaData
    });

  } catch (error) {
    console.error(`${'='.repeat(80)}`);
    console.error(`❌ PROCESSING ERROR: ${error.message}`);
    console.error(`${'='.repeat(80)}`);
    console.error('Full Error:', error);
    console.error('Stack:', error.stack);
    console.error(`${'='.repeat(80)}\n`);
    
    if (connection) connection.release();
    
    res.status(500).json({
      success: false,
      error: 'Processing failed',
      message: error.message
    });
  }
});

app.get('/api/recordings/:id/referto', async (req, res) => {
  let connection;
  try {
    const recordingId = req.params.id;

    connection = await pool.getConnection();
    const [recordings] = await connection.query(
      `SELECT id, patient_id, visit_type, doctor_name, transcript, referto_data, odontogramma_data, processing_status, created_at
       FROM recordings WHERE id = ? AND status != "deleted"`,
      [recordingId]
    );

    connection.release();

    if (!recordings || recordings.length === 0) {
      return res.status(404).json({ success: false, error: 'Recording not found' });
    }

    const recording = recordings[0];
    const referto = recording.referto_data ? JSON.parse(recording.referto_data) : null;
    const odontogramma = recording.odontogramma_data ? JSON.parse(recording.odontogramma_data) : null;

    res.json({
      success: true,
      recordingId: recording.id,
      patientId: recording.patient_id,
      visitType: recording.visit_type,
      doctorName: recording.doctor_name || null,
      transcript: recording.transcript || null,
      referto: referto,
      odontogramma: odontogramma,
      processingStatus: recording.processing_status || 'pending',
      createdAt: recording.created_at
    });

  } catch (error) {
    console.error('❌ Error retrieving referto:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/recordings/:id', async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { studio_id, doctor_name, transcript, referto_data, odontogramma_data } = req.body;

    if (!studio_id) {
      return res.status(400).json({ success: false, error: 'studio_id is required' });
    }

    connection = await pool.getConnection();

    await connection.query(
      `UPDATE recordings SET doctor_name = ?, transcript = ?, referto_data = ?, odontogramma_data = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND studio_id = ?`,
      [
        doctor_name || null,
        transcript || null, 
        referto_data ? JSON.stringify(referto_data) : null,
        odontogramma_data ? JSON.stringify(odontogramma_data) : null,
        id, 
        studio_id
      ]
    );

    const [updatedRecordingResults] = await connection.query('SELECT * FROM recordings WHERE id = ?', [id]);
    connection.release();

    res.json({ 
      success: true, 
      message: 'Recording updated successfully',
      data: updatedRecordingResults[0] 
    });
  } catch (error) {
    console.error('PUT /api/recordings/:id error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/recordings/:id', async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { studio_id } = req.body;

    if (!studio_id) {
      return res.status(400).json({ success: false, error: 'studio_id is required' });
    }

    connection = await pool.getConnection();
    
    const [recordingResults] = await connection.query(
      'SELECT audio_url FROM recordings WHERE id = ? AND studio_id = ?',
      [id, studio_id]
    );

    if (recordingResults && recordingResults.length > 0) {
      const audioUrl = recordingResults[0].audio_url;
      
      if (audioUrl && audioUrl.includes('/api/uploads/recordings/')) {
        const filename = audioUrl.split('/api/uploads/recordings/')[1];
        deleteAudioFile(filename);
      }
    }

    await connection.query(
      'UPDATE recordings SET status = "deleted", updated_at = CURRENT_TIMESTAMP WHERE id = ? AND studio_id = ?',
      [id, studio_id]
    );
    connection.release();

    res.json({ success: true, message: 'Recording deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/recordings/:id error:', error);
    if (connection) connection.release();
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
  console.error('\n🔥 UNHANDLED ERROR:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.use((req, res) => {
  console.log(`❌ 404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 MEDICAL AI SERVER STARTED`);
  console.log(`${'='.repeat(80)}`);
  console.log(`📊 Port: ${PORT}`);
  console.log(`📧 Health: http://localhost:${PORT}/api/health`);
  console.log(`📁 Uploads: ${uploadsDir}`);
  console.log(`🎤 Recordings: ${recordingsDir}`);
  console.log(`🔐 Auth endpoints: Login, Logout, Reset Password`);
  console.log(`👥 Admin CRUD: Create, Read, Update, Delete`);
  console.log(`🏥 Studios CRUD: Create, Read, Update, Delete`);
  console.log(`👤 Users CRUD: Create, Read, Update, Delete`);
  console.log(`👨‍⚕️ Patients CRUD: Create, Read, Update, Delete`);
  console.log(`🎤 Recordings CRUD: Create, Read, Update, Delete`);
  console.log(`🤖 AI Processing: /api/recordings/:id/process`);
  console.log(`📋 Referto API: /api/recordings/:id/referto`);
  console.log(`📊 Static Files: /api/uploads/* and /api/uploads/recordings/*`);
  console.log(`${'='.repeat(80)}\n`);
});