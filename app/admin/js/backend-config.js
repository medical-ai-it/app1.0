// ============================================================================
// Backend Configuration - Medical AI
// Gestisce tutte le chiamate API al backend Express + MySQL
// Support: localhost (dev) e Render (production)
// ============================================================================

// ✅ DETERMINA L'URL BASE IN BASE ALL'AMBIENTE
const BACKEND_CONFIG = (() => {
  let baseURL;
  
  // Se siamo in localhost, usa il backend locale
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    baseURL = 'http://localhost:3001/api';
    console.log('🔧 Backend: LOCALHOST (development)');
  }
  // Se siamo su medical-ai.it, usa Render
  else if (window.location.hostname === 'medical-ai.it' || window.location.hostname === 'app.medical-ai.it') {
    baseURL = 'https://app1-0-m2yf.onrender.com/api';
    console.log('☁️ Backend: RENDER (production)');
  }
  // Fallback per altri domini
  else {
    baseURL = 'https://app1-0-m2yf.onrender.com/api';
    console.log('⚠️ Backend: RENDER (fallback)');
  }

  return {
    baseURL: baseURL,
    endpoints: {
      admins: '/admins',
      studios: '/studios',
      users: '/users',
      login: '/auth/login',
      resetPassword: '/reset-password',
      changePassword: '/change-password'
    }
  };
})();

// Esponi l'URL per debugging
window.BACKEND_BASE_URL = BACKEND_CONFIG.baseURL;
console.log('📍 API Base URL:', BACKEND_CONFIG.baseURL);

/**
 * Wrapper generico per le chiamate al backend
 */
async function callBackendAPI(endpoint, method = 'GET', data = null) {
  try {
    const url = BACKEND_CONFIG.baseURL + endpoint;
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    console.log(`📡 ${method} ${url}`, data || '');
    
    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    console.log(`✅ Response:`, result);
    return result;
  } catch (error) {
    console.error(`❌ API Error (${endpoint}):`, error);
    showNotification(`Errore: ${error.message}`, 'error');
    throw error;
  }
}

// ==================== ADMIN CRUD FUNCTIONS ====================

/**
 * GET - Fetch all admins from database
 * Returns: Array of admin objects
 */
async function fetchAdminsFromDB() {
  try {
    const result = await callBackendAPI(BACKEND_CONFIG.endpoints.admins, 'GET');
    const admins = Array.isArray(result.data) ? result.data : [];
    console.log(`📊 Admin ricevuti dal backend: ${admins.length}`);
    return admins;
  } catch (error) {
    console.warn('⚠️ Backend unavailable, using localStorage fallback');
    return adminDB.admins || [];
  }
}

/**
 * GET - Fetch single admin by ID
 */
async function fetchAdminByIdFromDB(adminId) {
  try {
    const result = await callBackendAPI(`${BACKEND_CONFIG.endpoints.admins}/${adminId}`, 'GET');
    return result.data;
  } catch (error) {
    console.warn('⚠️ Backend unavailable, using localStorage fallback');
    return adminDB.getAdminById(adminId);
  }
}

/**
 * POST - Create new admin in database
 */
async function createAdminInDB(adminData) {
  try {
    const result = await callBackendAPI(BACKEND_CONFIG.endpoints.admins, 'POST', {
      name: adminData.name,
      email: adminData.email,
      password: adminData.password,
      role: adminData.role || 'admin',
      status: 'active'
    });
    
    showNotification('✅ Amministratore creato con successo', 'success');
    return result.data || adminData;
  } catch (error) {
    const newAdmin = adminDB.addAdmin(adminData);
    showNotification('⚠️ Salvato localmente (backend non disponibile)', 'info');
    return newAdmin;
  }
}

/**
 * PUT - Update admin in database
 */
async function updateAdminInDB(adminId, adminData) {
  try {
    const result = await callBackendAPI(
      `${BACKEND_CONFIG.endpoints.admins}/${adminId}`,
      'PUT',
      {
        name: adminData.name,
        role: adminData.role,
        status: adminData.status || 'active'
      }
    );
    
    showNotification('✅ Amministratore aggiornato con successo', 'success');
    return result;
  } catch (error) {
    adminDB.updateAdmin(adminId, adminData);
    showNotification('⚠️ Aggiornato localmente (backend non disponibile)', 'info');
    return adminData;
  }
}

/**
 * DELETE - Soft delete admin (set status = 'deleted')
 */
async function deleteAdminFromDB(adminId) {
  try {
    const result = await callBackendAPI(
      `${BACKEND_CONFIG.endpoints.admins}/${adminId}`,
      'DELETE'
    );
    
    showNotification('✅ Amministratore eliminato con successo', 'success');
    return result;
  } catch (error) {
    adminDB.deleteAdmin(adminId);
    showNotification('⚠️ Eliminato localmente (backend non disponibile)', 'info');
    return true;
  }
}

/**
 * POST - Reset password for admin
 */
async function resetPasswordInDB(adminId, newPassword) {
  try {
    const result = await callBackendAPI(
      `${BACKEND_CONFIG.endpoints.admins}/${adminId}/reset-password`,
      'POST',
      { newPassword: newPassword }
    );
    
    showNotification('✅ Password resettata con successo', 'success');
    return result;
  } catch (error) {
    const admin = adminDB.getAdminById(adminId);
    if (admin) {
      admin.password = newPassword;
    }
    showNotification('⚠️ Password aggiornata localmente (backend non disponibile)', 'info');
    return true;
  }
}

/**
 * POST - Change password for admin (requires old password)
 */
async function changePasswordInDB(adminId, oldPassword, newPassword) {
  try {
    const result = await callBackendAPI(
      `${BACKEND_CONFIG.endpoints.admins}/${adminId}/change-password`,
      'POST',
      {
        oldPassword: oldPassword,
        newPassword: newPassword
      }
    );
    
    showNotification('✅ Password cambiata con successo', 'success');
    return result;
  } catch (error) {
    showNotification(`❌ Errore nel cambio password: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * POST - Authenticate admin (login)
 */
async function authenticateAdmin(email, password) {
  try {
    const result = await callBackendAPI(
      BACKEND_CONFIG.endpoints.login,
      'POST',
      { email, password }
    );
    
    if (result.success && result.data) {
      return result;
    }
  } catch (error) {
    const admin = adminDB.validateAdmin(email, password);
    if (admin) {
      return { success: true, data: admin };
    }
    showNotification(`❌ Credenziali non valide`, 'error');
    throw error;
  }
}

// ==================== STUDIOS CRUD FUNCTIONS ====================

/**
 * GET - Fetch all studios from database
 * Returns: Array of studio objects
 */
async function fetchStudiosFromDB() {
  try {
    const result = await callBackendAPI(BACKEND_CONFIG.endpoints.studios, 'GET');
    const studios = Array.isArray(result.data) ? result.data : [];
    console.log(`🏥 Studio ricevuti dal backend: ${studios.length}`);
    return studios;
  } catch (error) {
    console.warn('⚠️ Backend unavailable, using localStorage fallback');
    return adminDB.studios || [];
  }
}

/**
 * GET - Fetch single studio by ID
 */
async function fetchStudioByIdFromDB(studioId) {
  try {
    const result = await callBackendAPI(`${BACKEND_CONFIG.endpoints.studios}/${studioId}`, 'GET');
    return result.data;
  } catch (error) {
    console.warn('⚠️ Backend unavailable, using localStorage fallback');
    return adminDB.getStudioById(studioId);
  }
}

/**
 * POST - Create new studio in database
 */
async function createStudioInDB(studioData) {
  try {
    const result = await callBackendAPI(BACKEND_CONFIG.endpoints.studios, 'POST', {
      name: studioData.name,
      email: studioData.email,
      phone: studioData.phone,
      status: 'attivo'
    });
    
    showNotification('✅ Studio creato con successo', 'success');
    return result.data || studioData;
  } catch (error) {
    const newStudio = adminDB.addStudio(studioData);
    showNotification('⚠️ Salvato localmente (backend non disponibile)', 'info');
    return newStudio;
  }
}

/**
 * PUT - Update studio in database
 */
async function updateStudioInDB(studioId, studioData) {
  try {
    const result = await callBackendAPI(
      `${BACKEND_CONFIG.endpoints.studios}/${studioId}`,
      'PUT',
      {
        name: studioData.name,
        email: studioData.email,
        phone: studioData.phone,
        status: studioData.status || 'attivo'
      }
    );
    
    showNotification('✅ Studio aggiornato con successo', 'success');
    return result.data || studioData;
  } catch (error) {
    adminDB.updateStudio(studioId, studioData);
    showNotification('⚠️ Aggiornato localmente (backend non disponibile)', 'info');
    return studioData;
  }
}

/**
 * DELETE - Soft delete studio (set status = 'deleted')
 */
async function deleteStudioFromDB(studioId) {
  try {
    const result = await callBackendAPI(
      `${BACKEND_CONFIG.endpoints.studios}/${studioId}`,
      'DELETE'
    );
    
    showNotification('✅ Studio eliminato con successo', 'success');
    return result;
  } catch (error) {
    adminDB.deleteStudio(studioId);
    showNotification('⚠️ Eliminato localmente (backend non disponibile)', 'info');
    return true;
  }
}

// ==================== USERS CRUD FUNCTIONS ====================

/**
 * GET - Fetch all users from database
 * Returns: Array of user objects
 */
async function fetchUsersFromDB() {
  try {
    const result = await callBackendAPI(BACKEND_CONFIG.endpoints.users, 'GET');
    const users = Array.isArray(result.data) ? result.data : [];
    console.log(`👥 Utenti ricevuti dal backend: ${users.length}`);
    return users;
  } catch (error) {
    console.warn('⚠️ Backend unavailable, using localStorage fallback');
    return adminDB.users || [];
  }
}

/**
 * GET - Fetch single user by ID
 */
async function fetchUserByIdFromDB(userId) {
  try {
    const result = await callBackendAPI(`${BACKEND_CONFIG.endpoints.users}/${userId}`, 'GET');
    return result.data;
  } catch (error) {
    console.warn('⚠️ Backend unavailable, using localStorage fallback');
    return adminDB.getUserById(userId);
  }
}

/**
 * POST - Create new user in database
 */
async function createUserInDB(userData) {
  try {
    const result = await callBackendAPI(BACKEND_CONFIG.endpoints.users, 'POST', {
      email: userData.email,
      password: userData.password,
      name: userData.name || null,
      studio_id: userData.studio_id,
      role: userData.role || 'user',
      status: 'active'
    });
    
    showNotification('✅ Utente creato con successo', 'success');
    return result.data || userData;
  } catch (error) {
    const newUser = adminDB.addUser(userData);
    showNotification('⚠️ Salvato localmente (backend non disponibile)', 'info');
    return newUser;
  }
}

/**
 * PUT - Update user in database
 */
async function updateUserInDB(userId, userData) {
  try {
    const result = await callBackendAPI(
      `${BACKEND_CONFIG.endpoints.users}/${userId}`,
      'PUT',
      {
        email: userData.email,
        name: userData.name || null,
        role: userData.role || 'user',
        status: userData.status || 'active'
      }
    );
    
    showNotification('✅ Utente aggiornato con successo', 'success');
    return result.data || userData;
  } catch (error) {
    adminDB.updateUser(userId, userData);
    showNotification('⚠️ Aggiornato localmente (backend non disponibile)', 'info');
    return userData;
  }
}

/**
 * DELETE - Soft delete user (set status = 'deleted')
 */
async function deleteUserFromDB(userId) {
  try {
    const result = await callBackendAPI(
      `${BACKEND_CONFIG.endpoints.users}/${userId}`,
      'DELETE'
    );
    
    showNotification('✅ Utente eliminato con successo', 'success');
    return result;
  } catch (error) {
    adminDB.deleteUser(userId);
    showNotification('⚠️ Eliminato localmente (backend non disponibile)', 'info');
    return true;
  }
}

/**
 * PUT - Update admin profile
 */
async function updateAdminProfileInDB(adminId, profileData) {
  try {
    const result = await callBackendAPI(
      `${BACKEND_CONFIG.endpoints.admins}/${adminId}`,
      'PUT',
      profileData
    );
    
    showNotification('✅ Profilo aggiornato con successo', 'success');
    return result;
  } catch (error) {
    const admin = adminDB.getAdminById(adminId);
    if (admin) Object.assign(admin, profileData);
    showNotification('⚠️ Aggiornato localmente (backend non disponibile)', 'info');
    return profileData;
  }
}

/**
 * POST - Change admin password
 */
async function changeAdminPasswordInDB(adminId, oldPassword, newPassword) {
  try {
    const result = await callBackendAPI(
      `${BACKEND_CONFIG.endpoints.admins}/${adminId}/change-password`,
      'POST',
      {
        oldPassword: oldPassword,
        newPassword: newPassword
      }
    );
    
    showNotification('✅ Password cambiata con successo', 'success');
    return result;
  } catch (error) {
    showNotification(`❌ Errore nel cambio password: ${error.message}`, 'error');
    throw error;
  }
}