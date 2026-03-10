/**
 * Tests unitarios para Google Workspace skills
 * Cumple con deployment-standards.md - filosofía 100/80/0
 */

import { describe, it, expect, vi } from 'vitest';
import { validateEmail, validateDate, validateTime, validateEventColor } from './types.js';

describe('Google Workspace Types & Validation', () => {
  describe('validateEmail', () => {
    it('should validate correct emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validateDate', () => {
    it('should validate correct dates', () => {
      expect(validateDate('2026-03-15')).toBe(true);
      expect(validateDate('2026-12-31')).toBe(true);
    });

    it('should reject invalid dates', () => {
      expect(validateDate('2026-13-01')).toBe(false);
      expect(validateDate('2026-02-30')).toBe(false);
      expect(validateDate('26-03-15')).toBe(false);
      expect(validateDate('invalid-date')).toBe(false);
    });
  });

  describe('validateTime', () => {
    it('should validate correct times', () => {
      expect(validateTime('09:30')).toBe(true);
      expect(validateTime('23:59')).toBe(true);
      expect(validateTime('00:00')).toBe(true);
    });

    it('should reject invalid times', () => {
      expect(validateTime('24:00')).toBe(false);
      expect(validateTime('12:60')).toBe(false);
      expect(validateTime('9:30')).toBe(false); // Should be 09:30
      expect(validateTime('invalid-time')).toBe(false);
    });
  });

  describe('validateEventColor', () => {
    it('should validate correct colors (1-11)', () => {
      expect(validateEventColor(1)).toBe(true);
      expect(validateEventColor(11)).toBe(true);
      expect(validateEventColor(5)).toBe(true);
    });

    it('should reject invalid colors', () => {
      expect(validateEventColor(0)).toBe(false);
      expect(validateEventColor(12)).toBe(false);
      expect(validateEventColor(-1)).toBe(false);
      expect(validateEventColor(1.5)).toBe(false);
    });
  });
});