// Tauri Integration Script
// This script helps ensure the window is visible and focused

if (typeof window !== 'undefined' && window.__TAURI__) {
  // Wait for the app to be ready
  window.__TAURI__.app.onMounted(() => {
    console.log('Tauri app mounted');
    
    // Ensure window is visible and focused
    window.__TAURI__.invoke('show_window').catch(err => {
      console.error('Failed to show window:', err);
    });
    
    // Debug window state
    window.__TAURI__.invoke('debug_window').then(result => {
      console.log('Window debug info:', result);
    }).catch(err => {
      console.error('Failed to debug window:', err);
    });
    
    // Check server status
    setTimeout(() => {
      window.__TAURI__.invoke('check_frontend_status').then(result => {
        console.log('Frontend server status:', result);
      }).catch(err => {
        console.error('Failed to check frontend status:', err);
      });
      
      window.__TAURI__.invoke('check_backend_status').then(result => {
        console.log('Backend server status:', result);
      }).catch(err => {
        console.error('Failed to check backend status:', err);
      });
    }, 2000); // Wait 2 seconds for servers to start
  });
  
  // Handle window focus events
  window.addEventListener('focus', () => {
    console.log('Window focused');
  });
  
  window.addEventListener('blur', () => {
    console.log('Window blurred');
  });
  
  // Handle visibility change
  document.addEventListener('visibilitychange', () => {
    console.log('Visibility changed:', document.visibilityState);
  });
} 