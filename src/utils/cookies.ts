// Secure Cookie Utility (to store local session/theme attributes with strict OWASP headers)

export class SecureCookies {
  /**
   * Sets a cookie with Secure, Path=/ and SameSite=Strict attributes.
   */
  static set(name: string, value: string, days?: number): void {
    if (typeof document === 'undefined') return;

    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = `; expires=${date.toUTCString()}`;
    }

    // Always enforce Secure (only HTTPS) and SameSite=Strict to protect against CSRF
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const secureFlag = isLocalhost ? '' : '; Secure';

    document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Strict${secureFlag}`;
  }

  /**
   * Retrieves a cookie value by name.
   */
  static get(name: string): string | null {
    if (typeof document === 'undefined') return null;

    const nameEQ = `${name}=`;
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
    return null;
  }

  /**
   * Deletes a cookie by name.
   */
  static remove(name: string): void {
    SecureCookies.set(name, '', -1);
  }
}
