// Authentication and subscription management
export class Auth {
  constructor() {
    this.BASE_URL = 'https://api.studyassistant.pro';
    this.subscriptionStatus = null;
    this.user = null;
  }

  async init() {
    try {
      const { token } = await chrome.storage.local.get(['token']);
      if (token) {
        await this.validateToken(token);
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
    }
  }

  async validateToken(token) {
    try {
      const response = await fetch(`${this.BASE_URL}/api/validate-token`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Invalid token');
      }

      const data = await response.json();
      this.user = data.user;
      this.subscriptionStatus = data.subscription;
      return true;
    } catch (error) {
      await chrome.storage.local.remove(['token']);
      this.user = null;
      this.subscriptionStatus = null;
      return false;
    }
  }

  async login() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, async (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        try {
          const response = await fetch(`${this.BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error('Login failed');
          }

          const { token: authToken, user, subscription } = await response.json();
          await chrome.storage.local.set({ token: authToken });
          
          this.user = user;
          this.subscriptionStatus = subscription;
          resolve({ user, subscription });
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  async logout() {
    await chrome.storage.local.remove(['token']);
    this.user = null;
    this.subscriptionStatus = null;
  }

  async checkSubscription() {
    if (!this.user) return false;

    try {
      const { token } = await chrome.storage.local.get(['token']);
      const response = await fetch(`${this.BASE_URL}/api/subscription`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to check subscription');
      }

      const { subscription } = await response.json();
      this.subscriptionStatus = subscription;
      return subscription.active;
    } catch (error) {
      console.error('Subscription check failed:', error);
      return false;
    }
  }

  async startTrial() {
    if (!this.user) throw new Error('User not authenticated');

    try {
      const { token } = await chrome.storage.local.get(['token']);
      const response = await fetch(`${this.BASE_URL}/api/trial/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to start trial');
      }

      const { subscription } = await response.json();
      this.subscriptionStatus = subscription;
      return subscription;
    } catch (error) {
      console.error('Failed to start trial:', error);
      throw error;
    }
  }

  getUsageLimit() {
    if (!this.subscriptionStatus?.active) return 0;
    return this.subscriptionStatus.plan === 'pro' ? Infinity : 50;
  }

  getRemainingUsage() {
    if (!this.subscriptionStatus?.active) return 0;
    if (this.subscriptionStatus.plan === 'pro') return Infinity;
    return Math.max(0, 50 - (this.subscriptionStatus.usage || 0));
  }
}