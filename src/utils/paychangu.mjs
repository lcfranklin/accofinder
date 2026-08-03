

class PayChanguSDK {
  constructor() {
    this.token = '';
    this.baseUrl = 'https://api.paychangu.com';
    this.timeoutMs = 30000;
  }

  auth(token) {
    this.token = token;
  }

  async _fetch(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': this.token,
          ...(options.headers || {})
        }
      });

      let data;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch (err) {
        throw new Error(`PayChangu returned invalid JSON: ${text.substring(0, 100)}`);
      }

      if (!res.ok) {
        const errorMessage = data?.message || data?.error || `PayChangu API Error: ${res.status} ${res.statusText}`;
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`PayChangu API request timed out after ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async supportedMomoOperators() {
    return this._fetch('/mobile-money/operators', { method: 'GET' });
  }

  async chargeMobileMoney(body) {
    return this._fetch('/mobile-money/payments/initialize', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async verifyDirectChargeStatus({ chargeId }) {
    return this._fetch(`/mobile-money/payments/${chargeId}/verify`, { method: 'GET' });
  }

  async singleChargeDetails({ chargeId }) {
    return this._fetch(`/mobile-money/payments/${chargeId}/details`, { method: 'GET' });
  }
}

export default new PayChanguSDK();
