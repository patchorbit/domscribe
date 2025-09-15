/**
 * Tests for PII redaction utilities
 *
 * Tests privacy protection through pattern-based and field-based redaction.
 * Follows Arrange-Act-Assert methodology.
 */

import { describe, it, expect } from 'vitest';
import {
  redactText,
  redactObject,
  redactPII,
  redactSensitiveFields,
} from './redaction.js';

describe('redactText', () => {
  describe('Email Redaction', () => {
    it('should redact email addresses', () => {
      // Arrange
      const text = 'Contact me at user@example.com for more info.';

      // Act
      const result = redactText(text, { patterns: ['email'] });

      // Assert
      expect(result).toBe('Contact me at [REDACTED] for more info.');
    });

    it('should redact multiple email addresses', () => {
      // Arrange
      const text = 'Email alice@example.com or bob@test.org';

      // Act
      const result = redactText(text, { patterns: ['email'] });

      // Assert
      expect(result).toBe('Email [REDACTED] or [REDACTED]');
    });

    it('should redact emails with different TLDs', () => {
      // Arrange
      const text = 'user@example.co.uk and admin@site.net';

      // Act
      const result = redactText(text, { patterns: ['email'] });

      // Assert
      expect(result).toBe('[REDACTED] and [REDACTED]');
    });

    it('should redact emails with special characters', () => {
      // Arrange
      const text = 'Email: user.name+tag@example-domain.com';

      // Act
      const result = redactText(text, { patterns: ['email'] });

      // Assert
      expect(result).toBe('Email: [REDACTED]');
    });

    it('should preserve partial email when preservePartial is true', () => {
      // Arrange
      const text = 'Contact: user@example.com';

      // Act
      const result = redactText(text, {
        patterns: ['email'],
        preservePartial: true,
      });

      // Assert
      expect(result).toBe('Contact: [REDACTED].com');
    });

    it('should not match very short emails', () => {
      // Arrange
      const text = 'a@b.c';

      // Act
      const result = redactText(text, {
        patterns: ['email'],
        preservePartial: true,
      });

      // Assert
      // Note: Email pattern requires minimum 2-char TLD, so very short emails don't match
      expect(result).toBe('a@b.c');
    });
  });

  describe('Phone Number Redaction', () => {
    it('should redact US phone numbers with dashes', () => {
      // Arrange
      const text = 'Call me at 123-456-7890';

      // Act
      const result = redactText(text, { patterns: ['phone'] });

      // Assert
      expect(result).toBe('Call me at [REDACTED]');
    });

    it('should redact phone numbers with dots', () => {
      // Arrange
      const text = 'Phone: 123.456.7890';

      // Act
      const result = redactText(text, { patterns: ['phone'] });

      // Assert
      expect(result).toBe('Phone: [REDACTED]');
    });

    it('should redact phone numbers with spaces', () => {
      // Arrange
      const text = 'Number: 123 456 7890';

      // Act
      const result = redactText(text, { patterns: ['phone'] });

      // Assert
      expect(result).toBe('Number: [REDACTED]');
    });

    it('should redact phone numbers with parentheses', () => {
      // Arrange
      const text = 'Call (123) 456-7890';

      // Act
      const result = redactText(text, { patterns: ['phone'] });

      // Assert
      expect(result).toBe('Call [REDACTED]');
    });

    it('should redact international phone numbers', () => {
      // Arrange
      const text = 'International: +1-123-456-7890';

      // Act
      const result = redactText(text, { patterns: ['phone'] });

      // Assert
      expect(result).toBe('International: [REDACTED]');
    });

    it('should redact multiple phone numbers', () => {
      // Arrange
      const text = 'Office: 123-456-7890, Mobile: 987-654-3210';

      // Act
      const result = redactText(text, { patterns: ['phone'] });

      // Assert
      expect(result).toBe('Office: [REDACTED], Mobile: [REDACTED]');
    });

    it('should preserve partial phone when preservePartial is true', () => {
      // Arrange
      const text = 'Call 123-456-7890';

      // Act
      const result = redactText(text, {
        patterns: ['phone'],
        preservePartial: true,
      });

      // Assert
      expect(result).toBe('Call [REDACTED]7890');
    });
  });

  describe('Credit Card Redaction', () => {
    it('should redact credit card numbers with dashes', () => {
      // Arrange
      const text = 'Card: 1234-5678-9012-3456';

      // Act
      const result = redactText(text, { patterns: ['creditCard'] });

      // Assert
      expect(result).toBe('Card: [REDACTED]');
    });

    it('should redact credit card numbers with spaces', () => {
      // Arrange
      const text = 'Card: 1234 5678 9012 3456';

      // Act
      const result = redactText(text, { patterns: ['creditCard'] });

      // Assert
      expect(result).toBe('Card: [REDACTED]');
    });

    it('should redact credit card numbers without separators', () => {
      // Arrange
      const text = 'Card: 1234567890123456';

      // Act
      const result = redactText(text, { patterns: ['creditCard'] });

      // Assert
      expect(result).toBe('Card: [REDACTED]');
    });

    it('should preserve partial credit card when preservePartial is true', () => {
      // Arrange
      const text = 'Card: 1234-5678-9012-3456';

      // Act
      const result = redactText(text, {
        patterns: ['creditCard'],
        preservePartial: true,
      });

      // Assert
      expect(result).toBe('Card: [REDACTED]3456');
    });
  });

  describe('SSN Redaction', () => {
    it('should redact social security numbers', () => {
      // Arrange
      const text = 'SSN: 123-45-6789';

      // Act
      const result = redactText(text, { patterns: ['ssn'] });

      // Assert
      expect(result).toBe('SSN: [REDACTED]');
    });

    it('should redact multiple SSNs', () => {
      // Arrange
      const text = 'SSNs: 123-45-6789 and 987-65-4321';

      // Act
      const result = redactText(text, { patterns: ['ssn'] });

      // Assert
      expect(result).toBe('SSNs: [REDACTED] and [REDACTED]');
    });

    it('should preserve partial SSN when preservePartial is true', () => {
      // Arrange
      const text = 'SSN: 123-45-6789';

      // Act
      const result = redactText(text, {
        patterns: ['ssn'],
        preservePartial: true,
      });

      // Assert
      expect(result).toBe('SSN: [REDACTED]6789');
    });
  });

  describe('IP Address Redaction', () => {
    it('should redact IPv4 addresses', () => {
      // Arrange
      const text = 'Server IP: 192.168.1.100';

      // Act
      const result = redactText(text, { patterns: ['ip'] });

      // Assert
      expect(result).toBe('Server IP: [REDACTED]');
    });

    it('should redact multiple IP addresses', () => {
      // Arrange
      const text = 'From 192.168.1.1 to 10.0.0.1';

      // Act
      const result = redactText(text, { patterns: ['ip'] });

      // Assert
      expect(result).toBe('From [REDACTED] to [REDACTED]');
    });

    it('should redact localhost IP', () => {
      // Arrange
      const text = 'Localhost: 127.0.0.1';

      // Act
      const result = redactText(text, { patterns: ['ip'] });

      // Assert
      expect(result).toBe('Localhost: [REDACTED]');
    });
  });

  describe('API Key Redaction', () => {
    it('should redact API keys', () => {
      // Arrange
      const text = 'API Key: sk_live_1234567890abcdefghijklmnopqrstuvwxyz';

      // Act
      const result = redactText(text, { patterns: ['apiKey'] });

      // Assert
      expect(result).toBe('API Key: [REDACTED]');
    });

    it('should redact multiple API keys', () => {
      // Arrange
      const text =
        'Keys: abcdef1234567890abcdef1234567890 and xyz1234567890xyz1234567890xyzabc';

      // Act
      const result = redactText(text, { patterns: ['apiKey'] });

      // Assert
      expect(result).toBe('Keys: [REDACTED] and [REDACTED]');
    });

    it('should preserve partial API key when preservePartial is true', () => {
      // Arrange
      const text = 'Key: sk_live_1234567890abcdefghijklmnopqrstuvwxyz';

      // Act
      const result = redactText(text, {
        patterns: ['apiKey'],
        preservePartial: true,
      });

      // Assert
      expect(result).toContain('[REDACTED]');
      expect(result).toContain('wxyz');
    });
  });

  describe('JWT Redaction', () => {
    it('should redact JWT tokens', () => {
      // Arrange
      const text =
        'Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      // Act
      const result = redactText(text, { patterns: ['jwt'] });

      // Assert
      expect(result).toBe('Token: [REDACTED]');
    });

    it('should redact multiple JWT tokens', () => {
      // Arrange
      const text =
        'Tokens: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.abc123 and eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJpc3N1ZXIifQ.xyz456';

      // Act
      const result = redactText(text, { patterns: ['jwt'] });

      // Assert
      expect(result).toBe('Tokens: [REDACTED] and [REDACTED]');
    });
  });

  describe('Multiple Patterns', () => {
    it('should redact multiple PII types in same text', () => {
      // Arrange
      const text =
        'Email user@example.com, Phone 123-456-7890, Card 1234-5678-9012-3456';

      // Act
      const result = redactText(text, {
        patterns: ['email', 'phone', 'creditCard'],
      });

      // Assert
      expect(result).toBe(
        'Email [REDACTED], Phone [REDACTED], Card [REDACTED]',
      );
    });

    it('should apply all patterns by default', () => {
      // Arrange
      const text =
        'Email: user@example.com, IP: 192.168.1.1, Phone: 123-456-7890';

      // Act
      const result = redactText(text);

      // Assert
      expect(result).toBe(
        'Email: [REDACTED], IP: [REDACTED], Phone: [REDACTED]',
      );
    });

    it('should handle text with no PII', () => {
      // Arrange
      const text = 'Hello world, this is a test message.';

      // Act
      const result = redactText(text);

      // Assert
      expect(result).toBe('Hello world, this is a test message.');
    });
  });

  describe('Custom Patterns', () => {
    it('should apply custom regex patterns', () => {
      // Arrange
      const text = 'Employee ID: EMP12345';
      const customPattern = /EMP\d{5}/g;

      // Act
      const result = redactText(text, {
        patterns: [],
        customPatterns: [customPattern],
      });

      // Assert
      expect(result).toBe('Employee ID: [REDACTED]');
    });

    it('should apply multiple custom patterns', () => {
      // Arrange
      const text = 'Order #ORD123 and Invoice #INV456';
      const orderPattern = /ORD\d{3}/g;
      const invoicePattern = /INV\d{3}/g;

      // Act
      const result = redactText(text, {
        patterns: [],
        customPatterns: [orderPattern, invoicePattern],
      });

      // Assert
      expect(result).toBe('Order #[REDACTED] and Invoice #[REDACTED]');
    });

    it('should combine built-in and custom patterns', () => {
      // Arrange
      const text = 'Email user@example.com, Employee EMP12345';
      const employeePattern = /EMP\d{5}/g;

      // Act
      const result = redactText(text, {
        patterns: ['email'],
        customPatterns: [employeePattern],
      });

      // Assert
      expect(result).toBe('Email [REDACTED], Employee [REDACTED]');
    });
  });

  describe('Custom Replacement', () => {
    it('should use custom replacement string', () => {
      // Arrange
      const text = 'Email: user@example.com';

      // Act
      const result = redactText(text, {
        patterns: ['email'],
        replacement: '***',
      });

      // Assert
      expect(result).toBe('Email: ***');
    });

    it('should use custom replacement for multiple redactions', () => {
      // Arrange
      const text = 'Email alice@test.com and bob@test.org';

      // Act
      const result = redactText(text, {
        patterns: ['email'],
        replacement: '[HIDDEN]',
      });

      // Assert
      expect(result).toBe('Email [HIDDEN] and [HIDDEN]');
    });

    it('should apply custom replacement with preservePartial', () => {
      // Arrange
      const text = 'Phone: 123-456-7890';

      // Act
      const result = redactText(text, {
        patterns: ['phone'],
        replacement: 'XXX',
        preservePartial: true,
      });

      // Assert
      expect(result).toBe('Phone: XXX7890');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      // Arrange
      const text = '';

      // Act
      const result = redactText(text);

      // Assert
      expect(result).toBe('');
    });

    it('should handle string with only whitespace', () => {
      // Arrange
      const text = '   \n\t   ';

      // Act
      const result = redactText(text);

      // Assert
      expect(result).toBe('   \n\t   ');
    });

    it('should handle text with special characters', () => {
      // Arrange
      const text = 'Contact: user@example.com! (or 123-456-7890?)';

      // Act
      const result = redactText(text, {
        patterns: ['email', 'phone'],
      });

      // Assert
      expect(result).toBe('Contact: [REDACTED]! (or [REDACTED]?)');
    });

    it('should handle text with unicode characters', () => {
      // Arrange
      const text = 'Correo: usuario@ejemplo.com 📧';

      // Act
      const result = redactText(text, { patterns: ['email'] });

      // Assert
      expect(result).toBe('Correo: [REDACTED] 📧');
    });

    it('should handle empty patterns array', () => {
      // Arrange
      const text = 'Email: user@example.com';

      // Act
      const result = redactText(text, { patterns: [] });

      // Assert
      expect(result).toBe('Email: user@example.com');
    });
  });

  describe('PreservePartial Edge Cases', () => {
    it('should not preserve partial for 4-character matches', () => {
      // Arrange
      const text = 'Code: 1234';

      // Act
      const result = redactText(text, {
        customPatterns: [/\d{4}/g],
        preservePartial: true,
      });

      // Assert
      expect(result).toBe('Code: [REDACTED]');
    });

    it('should not preserve partial for custom patterns', () => {
      // Arrange
      const text = 'Code: 12345';

      // Act
      const result = redactText(text, {
        customPatterns: [/\d{5}/g],
        preservePartial: true,
      });

      // Assert
      // Note: preservePartial only applies to built-in patterns, not custom patterns
      expect(result).toBe('Code: [REDACTED]');
    });
  });
});

describe('redactObject', () => {
  describe('Primitives', () => {
    it('should handle null', () => {
      // Arrange
      const value = null;

      // Act
      const result = redactObject(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle undefined', () => {
      // Arrange
      const value = undefined;

      // Act
      const result = redactObject(value);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should handle numbers', () => {
      // Arrange
      const value = 42;

      // Act
      const result = redactObject(value);

      // Assert
      expect(result).toBe(42);
    });

    it('should handle booleans', () => {
      // Arrange
      const trueValue = true;
      const falseValue = false;

      // Act
      const trueResult = redactObject(trueValue);
      const falseResult = redactObject(falseValue);

      // Assert
      expect(trueResult).toBe(true);
      expect(falseResult).toBe(false);
    });
  });

  describe('Strings', () => {
    it('should redact PII in strings', () => {
      // Arrange
      const value = 'Contact me at user@example.com';

      // Act
      const result = redactObject(value, { patterns: ['email'] });

      // Assert
      expect(result).toBe('Contact me at [REDACTED]');
    });

    it('should handle empty strings', () => {
      // Arrange
      const value = '';

      // Act
      const result = redactObject(value);

      // Assert
      expect(result).toBe('');
    });
  });

  describe('Arrays', () => {
    it('should redact PII in array elements', () => {
      // Arrange
      const value = [
        'Email: user@example.com',
        'Phone: 123-456-7890',
        'No PII here',
      ];

      // Act
      const result = redactObject(value, {
        patterns: ['email', 'phone'],
      });

      // Assert
      expect(result).toEqual([
        'Email: [REDACTED]',
        'Phone: [REDACTED]',
        'No PII here',
      ]);
    });

    it('should handle empty arrays', () => {
      // Arrange
      const value: unknown[] = [];

      // Act
      const result = redactObject(value);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle nested arrays', () => {
      // Arrange
      const value = [['Email: user@example.com'], ['Phone: 123-456-7890']];

      // Act
      const result = redactObject(value, {
        patterns: ['email', 'phone'],
      });

      // Assert
      expect(result).toEqual([['Email: [REDACTED]'], ['Phone: [REDACTED]']]);
    });

    it('should handle arrays with mixed types', () => {
      // Arrange
      const value = [
        'user@example.com',
        42,
        true,
        null,
        { email: 'admin@test.com' },
      ];

      // Act
      const result = redactObject(value, { patterns: ['email'] });

      // Assert
      expect(result).toEqual([
        '[REDACTED]',
        42,
        true,
        null,
        { email: '[REDACTED]' },
      ]);
    });
  });

  describe('Objects', () => {
    it('should redact PII in object values', () => {
      // Arrange
      const value = {
        email: 'user@example.com',
        phone: '123-456-7890',
        name: 'Alice',
      };

      // Act
      const result = redactObject(value, {
        patterns: ['email', 'phone'],
      });

      // Assert
      expect(result).toEqual({
        email: '[REDACTED]',
        phone: '[REDACTED]',
        name: 'Alice',
      });
    });

    it('should handle empty objects', () => {
      // Arrange
      const value = {};

      // Act
      const result = redactObject(value);

      // Assert
      expect(result).toEqual({});
    });

    it('should handle nested objects', () => {
      // Arrange
      const value = {
        user: {
          email: 'user@example.com',
          contact: {
            phone: '123-456-7890',
          },
        },
      };

      // Act
      const result = redactObject(value, {
        patterns: ['email', 'phone'],
      });

      // Assert
      expect(result).toEqual({
        user: {
          email: '[REDACTED]',
          contact: {
            phone: '[REDACTED]',
          },
        },
      });
    });

    it('should only redact own properties', () => {
      // Arrange
      const proto = { inherited: 'user@example.com' };
      const value = Object.create(proto);
      value.own = 'admin@test.com';

      // Act
      const result = redactObject(value, { patterns: ['email'] });

      // Assert
      expect(result).toEqual({
        own: '[REDACTED]',
      });
    });
  });

  describe('Complex Structures', () => {
    it('should redact deeply nested structures', () => {
      // Arrange
      const value = {
        level1: {
          level2: {
            level3: {
              email: 'user@example.com',
              data: ['phone: 123-456-7890'],
            },
          },
        },
      };

      // Act
      const result = redactObject(value, {
        patterns: ['email', 'phone'],
      });

      // Assert
      expect(result).toEqual({
        level1: {
          level2: {
            level3: {
              email: '[REDACTED]',
              data: ['phone: [REDACTED]'],
            },
          },
        },
      });
    });

    it('should handle objects with arrays of objects', () => {
      // Arrange
      const value = {
        users: [
          { email: 'alice@test.com', name: 'Alice' },
          { email: 'bob@test.com', name: 'Bob' },
        ],
      };

      // Act
      const result = redactObject(value, { patterns: ['email'] });

      // Assert
      expect(result).toEqual({
        users: [
          { email: '[REDACTED]', name: 'Alice' },
          { email: '[REDACTED]', name: 'Bob' },
        ],
      });
    });

    it('should handle arrays of nested objects', () => {
      // Arrange
      const value = [
        {
          profile: {
            email: 'user1@test.com',
          },
        },
        {
          profile: {
            email: 'user2@test.com',
          },
        },
      ];

      // Act
      const result = redactObject(value, { patterns: ['email'] });

      // Assert
      expect(result).toEqual([
        {
          profile: {
            email: '[REDACTED]',
          },
        },
        {
          profile: {
            email: '[REDACTED]',
          },
        },
      ]);
    });
  });

  describe('Non-Plain Objects', () => {
    it('should serialize Date objects as empty objects', () => {
      // Arrange
      const value = new Date('2025-01-01');

      // Act
      const result = redactObject(value);

      // Assert
      // Note: Date objects have no enumerable properties, so they serialize to {}
      expect(result).toEqual({});
    });

    it('should serialize RegExp objects as empty objects', () => {
      // Arrange
      const value = /test/gi;

      // Act
      const result = redactObject(value);

      // Assert
      // Note: RegExp objects have no enumerable properties, so they serialize to {}
      expect(result).toEqual({});
    });

    it('should serialize Map objects as empty objects', () => {
      // Arrange
      const value = new Map([['key', 'value']]);

      // Act
      const result = redactObject(value);

      // Assert
      // Note: Map objects have no enumerable properties, so they serialize to {}
      expect(result).toEqual({});
    });

    it('should serialize Set objects as empty objects', () => {
      // Arrange
      const value = new Set([1, 2, 3]);

      // Act
      const result = redactObject(value);

      // Assert
      // Note: Set objects have no enumerable properties, so they serialize to {}
      expect(result).toEqual({});
    });
  });

  describe('Options Propagation', () => {
    it('should apply custom replacement throughout object', () => {
      // Arrange
      const value = {
        a: 'user@example.com',
        b: ['admin@test.com'],
        c: { d: 'info@site.org' },
      };

      // Act
      const result = redactObject(value, {
        patterns: ['email'],
        replacement: '***',
      });

      // Assert
      expect(result).toEqual({
        a: '***',
        b: ['***'],
        c: { d: '***' },
      });
    });

    it('should apply preservePartial throughout object', () => {
      // Arrange
      const value = {
        email1: 'user@example.com',
        nested: {
          email2: 'admin@test.com',
        },
      };

      // Act
      const result = redactObject(value, {
        patterns: ['email'],
        preservePartial: true,
      });

      // Assert
      expect(result).toEqual({
        email1: '[REDACTED].com',
        nested: {
          email2: '[REDACTED].com',
        },
      });
    });
  });
});

describe('redactPII', () => {
  it('should redact common PII types', () => {
    // Arrange
    const value = {
      email: 'user@example.com',
      phone: '123-456-7890',
      creditCard: '1234-5678-9012-3456',
      ssn: '123-45-6789',
      ip: '192.168.1.1',
      apiKey: 'sk_live_1234567890abcdefghijklmnopqrstuvwxyz',
      jwt: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.abc123',
    };

    // Act
    const result = redactPII(value);

    // Assert
    expect(result).toEqual({
      email: '[REDACTED]',
      phone: '[REDACTED]',
      creditCard: '[REDACTED]',
      ssn: '[REDACTED]',
      ip: '[REDACTED]',
      apiKey: '[REDACTED]',
      jwt: '[REDACTED]',
    });
  });

  it('should handle nested structures', () => {
    // Arrange
    const value = {
      user: {
        email: 'user@example.com',
        contact: {
          phone: '123-456-7890',
        },
      },
    };

    // Act
    const result = redactPII(value);

    // Assert
    expect(result).toEqual({
      user: {
        email: '[REDACTED]',
        contact: {
          phone: '[REDACTED]',
        },
      },
    });
  });

  it('should handle arrays', () => {
    // Arrange
    const value = ['user@example.com', '123-456-7890', 'Safe text'];

    // Act
    const result = redactPII(value);

    // Assert
    expect(result).toEqual(['[REDACTED]', '[REDACTED]', 'Safe text']);
  });

  it('should handle null and undefined', () => {
    // Arrange
    const nullValue = null;
    const undefinedValue = undefined;

    // Act
    const nullResult = redactPII(nullValue);
    const undefinedResult = redactPII(undefinedValue);

    // Assert
    expect(nullResult).toBeNull();
    expect(undefinedResult).toBeUndefined();
  });
});

describe('redactSensitiveFields', () => {
  describe('Built-in Sensitive Fields', () => {
    it('should redact password field', () => {
      // Arrange
      const value = {
        username: 'alice',
        password: 'secret123',
        email: 'alice@example.com',
      };

      // Act
      const result = redactSensitiveFields(value);

      // Assert
      expect(result).toEqual({
        username: 'alice',
        password: '[REDACTED]',
        email: 'alice@example.com',
      });
    });

    it('should redact token field', () => {
      // Arrange
      const value = {
        token: 'abc123xyz',
        data: 'public',
      };

      // Act
      const result = redactSensitiveFields(value);

      // Assert
      expect(result).toEqual({
        token: '[REDACTED]',
        data: 'public',
      });
    });

    it('should redact apikey field', () => {
      // Arrange
      const value = {
        apikey: 'sk_live_123',
        name: 'Service',
      };

      // Act
      const result = redactSensitiveFields(value);

      // Assert
      expect(result).toEqual({
        apikey: '[REDACTED]',
        name: 'Service',
      });
    });

    it('should redact all built-in sensitive fields', () => {
      // Arrange
      const value = {
        password: 'pass123',
        passwd: 'pass456',
        pwd: 'pass789',
        secret: 'secret123',
        token: 'token123',
        apikey: 'key123',
        api_key: 'key456',
        authtoken: 'auth123',
        auth_token: 'auth456',
        accesstoken: 'access123',
        access_token: 'access456',
        refreshtoken: 'refresh123',
        refresh_token: 'refresh456',
        privatekey: 'private123',
        private_key: 'private456',
        creditcard: '1234',
        credit_card: '5678',
        cardnumber: '9012',
        card_number: '3456',
        cvv: '123',
        ssn: '789',
        social_security: '456',
      };

      // Act
      const result = redactSensitiveFields(value);

      // Assert
      const allKeys = Object.keys(value);
      for (const key of allKeys) {
        expect(result).toHaveProperty(key, '[REDACTED]');
      }
    });
  });

  describe('Case Insensitivity', () => {
    it('should redact fields regardless of case', () => {
      // Arrange
      const value = {
        PASSWORD: 'secret1',
        Password: 'secret2',
        password: 'secret3',
        pAsSwOrD: 'secret4',
      };

      // Act
      const result = redactSensitiveFields(value);

      // Assert
      expect(result).toEqual({
        PASSWORD: '[REDACTED]',
        Password: '[REDACTED]',
        password: '[REDACTED]',
        pAsSwOrD: '[REDACTED]',
      });
    });

    it('should preserve original case in keys', () => {
      // Arrange
      const value = {
        PASSWORD: 'secret1',
        Token: 'secret2',
        OtherData: 'public',
      };

      // Act
      const result = redactSensitiveFields(value);

      // Assert
      // Note: Sensitive field matching is case-insensitive but preserves original key names
      expect(result).toEqual({
        PASSWORD: '[REDACTED]',
        Token: '[REDACTED]',
        OtherData: 'public',
      });
    });
  });

  describe('Custom Sensitive Fields', () => {
    it('should redact additional custom fields', () => {
      // Arrange
      const value = {
        userId: '12345',
        sessionId: 'abc123',
        password: 'secret',
      };

      // Act
      const result = redactSensitiveFields(value, ['userId', 'sessionId']);

      // Assert
      expect(result).toEqual({
        userId: '[REDACTED]',
        sessionId: '[REDACTED]',
        password: '[REDACTED]',
      });
    });

    it('should handle custom fields with mixed case', () => {
      // Arrange
      const value = {
        CustomField: 'sensitive',
        OtherField: 'public',
      };

      // Act
      const result = redactSensitiveFields(value, ['customfield']);

      // Assert
      expect(result).toEqual({
        CustomField: '[REDACTED]',
        OtherField: 'public',
      });
    });
  });

  describe('Nested Objects', () => {
    it('should redact sensitive fields in nested objects', () => {
      // Arrange
      const value = {
        user: {
          name: 'Alice',
          password: 'secret123',
          profile: {
            token: 'abc123',
          },
        },
      };

      // Act
      const result = redactSensitiveFields(value);

      // Assert
      expect(result).toEqual({
        user: {
          name: 'Alice',
          password: '[REDACTED]',
          profile: {
            token: '[REDACTED]',
          },
        },
      });
    });

    it('should propagate custom fields to nested objects', () => {
      // Arrange
      const value = {
        level1: {
          customSecret: 'value1',
          level2: {
            customSecret: 'value2',
          },
        },
      };

      // Act
      const result = redactSensitiveFields(value, ['customSecret']);

      // Assert
      expect(result).toEqual({
        level1: {
          customSecret: '[REDACTED]',
          level2: {
            customSecret: '[REDACTED]',
          },
        },
      });
    });
  });

  describe('Arrays', () => {
    it('should redact sensitive fields in array elements', () => {
      // Arrange
      const value = [
        { name: 'Alice', password: 'pass1' },
        { name: 'Bob', password: 'pass2' },
      ];

      // Act
      const result = redactSensitiveFields(value);

      // Assert
      expect(result).toEqual([
        { name: 'Alice', password: '[REDACTED]' },
        { name: 'Bob', password: '[REDACTED]' },
      ]);
    });

    it('should propagate custom fields to array elements', () => {
      // Arrange
      const value = [
        { id: '1', secret: 'value1' },
        { id: '2', secret: 'value2' },
      ];

      // Act
      const result = redactSensitiveFields(value, ['secret']);

      // Assert
      expect(result).toEqual([
        { id: '1', secret: '[REDACTED]' },
        { id: '2', secret: '[REDACTED]' },
      ]);
    });
  });

  describe('Primitives and Non-Objects', () => {
    it('should handle null', () => {
      // Arrange
      const value = null;

      // Act
      const result = redactSensitiveFields(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle undefined', () => {
      // Arrange
      const value = undefined;

      // Act
      const result = redactSensitiveFields(value);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should handle numbers', () => {
      // Arrange
      const value = 42;

      // Act
      const result = redactSensitiveFields(value);

      // Assert
      expect(result).toBe(42);
    });

    it('should handle strings', () => {
      // Arrange
      const value = 'plain string';

      // Act
      const result = redactSensitiveFields(value);

      // Assert
      expect(result).toBe('plain string');
    });

    it('should handle booleans', () => {
      // Arrange
      const trueValue = true;
      const falseValue = false;

      // Act
      const trueResult = redactSensitiveFields(trueValue);
      const falseResult = redactSensitiveFields(falseValue);

      // Assert
      expect(trueResult).toBe(true);
      expect(falseResult).toBe(false);
    });
  });

  describe('Non-Plain Objects', () => {
    it('should serialize Date objects as empty objects', () => {
      // Arrange
      const value = new Date('2025-01-01');

      // Act
      const result = redactSensitiveFields(value);

      // Assert
      // Note: Date objects have no enumerable properties, so they serialize to {}
      expect(result).toEqual({});
    });

    it('should serialize RegExp objects as empty objects', () => {
      // Arrange
      const value = /test/gi;

      // Act
      const result = redactSensitiveFields(value);

      // Assert
      // Note: RegExp objects have no enumerable properties, so they serialize to {}
      expect(result).toEqual({});
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty objects', () => {
      // Arrange
      const value = {};

      // Act
      const result = redactSensitiveFields(value);

      // Assert
      expect(result).toEqual({});
    });

    it('should handle empty arrays', () => {
      // Arrange
      const value: unknown[] = [];

      // Act
      const result = redactSensitiveFields(value);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle objects with only non-sensitive fields', () => {
      // Arrange
      const value = {
        name: 'Alice',
        age: 30,
        city: 'NYC',
      };

      // Act
      const result = redactSensitiveFields(value);

      // Assert
      expect(result).toEqual({
        name: 'Alice',
        age: 30,
        city: 'NYC',
      });
    });

    it('should handle empty custom fields array', () => {
      // Arrange
      const value = {
        password: 'secret',
        custom: 'value',
      };

      // Act
      const result = redactSensitiveFields(value, []);

      // Assert
      expect(result).toEqual({
        password: '[REDACTED]',
        custom: 'value',
      });
    });
  });
});

describe('Integration Scenarios', () => {
  it('should combine pattern-based and field-based redaction', () => {
    // Arrange
    const data = {
      user: {
        email: 'user@example.com',
        password: 'secret123',
        phone: '123-456-7890',
      },
      metadata: {
        ip: '192.168.1.1',
        token: 'abc123xyz',
      },
    };

    // Act - First redact by patterns
    const piiRedacted = redactPII(data);
    // Then redact sensitive fields
    const result = redactSensitiveFields(piiRedacted);

    // Assert
    expect(result).toEqual({
      user: {
        email: '[REDACTED]',
        password: '[REDACTED]',
        phone: '[REDACTED]',
      },
      metadata: {
        ip: '[REDACTED]',
        token: '[REDACTED]',
      },
    });
  });

  it('should handle React component props', () => {
    // Arrange
    const props = {
      onClick: 'function () {}',
      userEmail: 'user@example.com',
      apiToken: 'sk_live_1234567890abcdefghijklmnopqrstuvwxyz',
      displayName: 'Alice',
    };

    // Act
    const result = redactObject(props, { patterns: ['email', 'apiKey'] });

    // Assert
    expect(result).toEqual({
      onClick: 'function () {}',
      userEmail: '[REDACTED]',
      apiToken: '[REDACTED]',
      displayName: 'Alice',
    });
  });

  it('should handle Vue component state', () => {
    // Arrange
    const state = {
      user: {
        credentials: {
          username: 'alice',
          password: 'secret123',
        },
        contact: {
          email: 'alice@example.com',
          phone: '123-456-7890',
        },
      },
    };

    // Act
    const result = redactSensitiveFields(redactPII(state));

    // Assert
    expect(result).toEqual({
      user: {
        credentials: {
          username: 'alice',
          password: '[REDACTED]',
        },
        contact: {
          email: '[REDACTED]',
          phone: '[REDACTED]',
        },
      },
    });
  });

  it('should handle API response data', () => {
    // Arrange
    const response = {
      users: [
        {
          id: 1,
          email: 'user1@example.com',
          apiKey: 'sk_live_user1key123456789012345678',
        },
        {
          id: 2,
          email: 'user2@example.com',
          apiKey: 'sk_live_user2key987654321098765432',
        },
      ],
      metadata: {
        serverIp: '192.168.1.100',
        jwt: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.abc123',
      },
    };

    // Act
    const result = redactObject(redactSensitiveFields(response), {
      patterns: ['email', 'apiKey', 'ip', 'jwt'],
    });

    // Assert
    expect(result).toEqual({
      users: [
        {
          id: 1,
          email: '[REDACTED]',
          apiKey: '[REDACTED]',
        },
        {
          id: 2,
          email: '[REDACTED]',
          apiKey: '[REDACTED]',
        },
      ],
      metadata: {
        serverIp: '[REDACTED]',
        jwt: '[REDACTED]',
      },
    });
  });
});
