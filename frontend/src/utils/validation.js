/**
 * Validation helpers for form inputs across the application.
 * These utilities provide consistent real-time validation patterns.
 */

/**
 * Validates an email address format
 */
export const validateEmail = (value) => {
  if (!value || !value.trim()) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value.trim());
};

/**
 * Validates a phone number format
 */
export const validatePhone = (value) => {
  if (!value || value.trim() === '') return true; // Allow empty/optional
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,4}$/;
  return phoneRegex.test(value.trim());
};

/**
 * Validates password strength
 * Returns object with isValid, strength level, label, and color
 */
export const getPasswordStrength = (password) => {
  if (!password) return { isValid: false, strength: 0, label: '', color: '', minLength: false };
  
  let strength = 0;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isLongEnough = password.length >= 8;
  
  if (isLongEnough) strength++;
  if (password.length >= 12) strength++;
  if (hasLower && hasUpper) strength++;
  if (hasNumber) strength++;
  if (hasSpecial) strength++;
  
  const isValid = isLongEnough && strength >= 2;
  
  if (strength <= 1) return { isValid, strength: 1, label: 'Weak', color: '#FF4444', minLength: isLongEnough };
  if (strength <= 2) return { isValid, strength: 2, label: 'Fair', color: '#FFA500', minLength: isLongEnough };
  if (strength <= 3) return { isValid, strength: 3, label: 'Good', color: '#FFD700', minLength: isLongEnough };
  return { isValid, strength: 4, label: 'Strong', color: '#4CAF50', minLength: isLongEnough };
};

/**
 * Validates a username
 */
export const validateUsername = (username) => {
  if (!username || !username.trim()) return { isValid: false, error: 'Username is required' };
  const trimmed = username.trim();
  if (trimmed.length < 3) return { isValid: false, error: 'Username must be at least 3 characters' };
  if (trimmed.length > 30) return { isValid: false, error: 'Username must be less than 30 characters' };
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return { isValid: false, error: 'Username can only contain letters, numbers, and underscores' };
  return { isValid: true, error: '' };
};

/**
 * Validates a full name
 */
export const validateFullName = (name) => {
  if (!name || !name.trim()) return { isValid: false, error: 'Full name is required' };
  if (name.trim().length < 2) return { isValid: false, error: 'Full name must be at least 2 characters' };
  return { isValid: true, error: '' };
};

/**
 * Validates a numeric value within a range
 */
export const validateNumberRange = (value, min, max, fieldName = 'Value') => {
  if (!value || value.toString().trim() === '') return { isValid: false, error: `${fieldName} is required` };
  const num = parseInt(value, 10);
  if (isNaN(num)) return { isValid: false, error: `${fieldName} must be a valid number` };
  if (num < min || num > max) return { isValid: false, error: `${fieldName} must be between ${min} and ${max}` };
  return { isValid: true, error: '' };
};

/**
 * Validates that a field is not empty
 */
export const validateRequired = (value, fieldName = 'This field') => {
  if (!value || (typeof value === 'string' && !value.trim())) return { isValid: false, error: `${fieldName} is required` };
  return { isValid: true, error: '' };
};

/**
 * Generic form validation helper
 * @param {Object} formData - Object with field values
 * @param {Object} rules - Validation rules for each field
 * @returns {Object} - Object with field errors
 * 
 * Example usage:
 * const rules = {
 *   email: (v) => validateEmail(v) ? '' : 'Invalid email',
 *   name: (v) => validateFullName(v).error,
 * };
 * const errors = validateForm(formData, rules);
 */
export const validateForm = (formData, rules) => {
  const errors = {};
  Object.keys(rules).forEach(field => {
    if (rules[field]) {
      errors[field] = rules[field](formData[field]);
    }
  });
  return errors;
};

/**
 * Checks if there are any errors in the errors object
 */
export const hasErrors = (errors) => {
  return Object.values(errors).some(error => error && error !== '');
};