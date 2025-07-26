// Session Manager for real-time session validation
import { performLogout } from './logout';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class SessionManager {
  private intervalId: NodeJS.Timeout | null = null;
  private checkInterval: number = 1000; // Check every 1 second for fastest detection
  private isActive: boolean = false;
  private lastActivityCheck: number = 0;
  private broadcastChannel: BroadcastChannel | null = null;

  // Start session monitoring
  startMonitoring() {
    if (this.isActive || typeof window === 'undefined') return;
    
    this.isActive = true;
    
    // Initialize BroadcastChannel for cross-tab communication
    this.broadcastChannel = new BroadcastChannel('vyapar_auth');
    this.broadcastChannel.addEventListener('message', (event) => {
      if (event.data.type === 'FORCE_LOGOUT') {
        console.log('Received force logout from another tab');
        this.stopMonitoring();
        window.location.href = '/';
      }
    });
    
    // Check session validity every 1 second
    this.intervalId = setInterval(() => {
      this.checkSession();
    }, this.checkInterval);

    // Also check when page becomes visible (tab focus)
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.addEventListener('focus', this.handleWindowFocus.bind(this));
    
    // Check on user activity
    document.addEventListener('click', this.handleUserActivity.bind(this));
    document.addEventListener('keydown', this.handleUserActivity.bind(this));
    document.addEventListener('mousemove', this.throttleUserActivity.bind(this));

    // Listen for storage changes (when token gets cleared by another tab)
    window.addEventListener('storage', this.handleStorageChange.bind(this));

    console.log('Session monitoring started');
  }

  // Stop session monitoring
  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Close BroadcastChannel
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.removeEventListener('focus', this.handleWindowFocus.bind(this));
    document.removeEventListener('click', this.handleUserActivity.bind(this));
    document.removeEventListener('keydown', this.handleUserActivity.bind(this));
    document.removeEventListener('mousemove', this.throttleUserActivity.bind(this));
    window.removeEventListener('storage', this.handleStorageChange.bind(this));
    
    this.isActive = false;
    console.log('Session monitoring stopped');
  }

  // Handle page visibility change
  private handleVisibilityChange() {
    if (!document.hidden) {
      this.checkSession();
    }
  }

  // Handle window focus
  private handleWindowFocus() {
    this.checkSession();
  }

  // Handle user activity (click, keydown)
  private handleUserActivity() {
    this.checkSession();
  }

  // Throttled user activity check (for mousemove)
  private throttleUserActivity() {
    const now = Date.now();
    if (now - this.lastActivityCheck > 5000) { // Check every 5 seconds on mouse move
      this.lastActivityCheck = now;
      this.checkSession();
    }
  }

  // Handle localStorage changes from other tabs
  private handleStorageChange(event: StorageEvent) {
    if (event.key === 'token' || event.key === 'isAuthenticated') {
      if (!event.newValue || event.newValue === '') {
        // Token was cleared, logout immediately
        this.stopMonitoring();
        window.location.href = '/';
      }
    }
  }

  // Check if current session is valid
  private async checkSession() {
    try {
      const token = localStorage.getItem('token');
      const isAuthenticated = localStorage.getItem('isAuthenticated');
      
      if (!token || !isAuthenticated) {
        console.log('No token or authentication found, skipping session check');
        return;
      }

      
      // Make a simple API call to verify session
      const response = await fetch(`${API_BASE_URL}/api/session-check`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });


      if (!response.ok) {
        if (response.status === 401) {
          const data = await response.json();
          console.log('Session check failed:', data);
          if (data.code === 'SESSION_EXPIRED') {
            console.log('Session expired - logging out automatically');
            
            // Broadcast to other tabs
            if (this.broadcastChannel) {
              this.broadcastChannel.postMessage({ type: 'FORCE_LOGOUT' });
            }
            
            this.stopMonitoring();
            await performLogout();
          }
        }
      } else {
        console.log();
      }
    } catch (error) {
      console.error('Session check failed:', error);
    }
  }

  // Check session immediately (for manual triggers)
  async checkSessionNow() {
    await this.checkSession();
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

export default sessionManager;
