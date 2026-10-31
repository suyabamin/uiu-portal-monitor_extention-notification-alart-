/**
 * Base Portal Adapter Interface
 */

export class BasePortalAdapter {
  constructor(portalName) {
    this.portalName = portalName;
  }

  /**
   * Verifies whether the portal has an active authenticated session.
   * @returns {Promise<{connectionState: string, lastCheckedAt: string, error?: string}>}
   */
  async checkSession() {
    throw new Error('checkSession() must be implemented by adapter');
  }

  /**
   * Scans the portal for current academic items.
   * @returns {Promise<{items: Array<Object>, status: string, errors: Array<string>}>}
   */
  async scan() {
    throw new Error('scan() must be implemented by adapter');
  }
}
