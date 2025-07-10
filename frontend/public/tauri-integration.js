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