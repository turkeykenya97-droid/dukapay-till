/**
 * Validation utilities for form inputs and server errors
 * Provides consistent, user-friendly error messages
 */

export interface ValidationError {
  field: string;
  message: string;
}

export const validators = {
  // Phone validation
  phone: {
    validate: (phone: string): ValidationError | null => {
      if (!phone) return { field: "phone", message: "Please enter your phone number" };
      const cleaned = phone.replace(/\D/g, "");
      if (!/^0\d{9}$/.test(cleaned)) {
        return { field: "phone", message: "Please enter a valid Kenyan phone number (07XX XXX XXX)" };
      }
      return null;
    },
  },

  // Password validation
  password: {
    validate: (password: string): ValidationError | null => {
      if (!password) return { field: "password", message: "Please enter your password" };
      if (password.length < 6) {
        return { field: "password", message: "Password must be at least 6 characters" };
      }
      return null;
    },
  },

  // PIN validation
  pin: {
    validate: (pin: string): ValidationError | null => {
      if (!pin) return { field: "pin", message: "Please enter your 4-digit PIN" };
      if (!/^\d{4}$/.test(pin)) {
        return { field: "pin", message: "PIN must be exactly 4 digits" };
      }
      return null;
    },
  },

  // Name validation
  name: {
    validate: (name: string, fieldName = "Name"): ValidationError | null => {
      if (!name) return { field: "name", message: `${fieldName} is required` };
      if (name.length < 2) {
        return { field: "name", message: `${fieldName} must be at least 2 characters` };
      }
      return null;
    },
  },

  // Till number validation
  tillNumber: {
    validate: (till: string): ValidationError | null => {
      if (!till) return { field: "till", message: "Till number is required" };
      const cleaned = till.replace(/\D/g, "");
      if (cleaned.length < 4 || cleaned.length > 12) {
        return { field: "till", message: "Please enter a valid till number (4-12 digits)" };
      }
      return null;
    },
  },

  // Amount validation
  amount: {
    validate: (amount: string, maxAmount = 300000): ValidationError | null => {
      if (!amount) return { field: "amount", message: "Please enter an amount" };
      const numAmount = parseInt(amount, 10);
      if (isNaN(numAmount) || numAmount < 1) {
        return { field: "amount", message: "Minimum amount is KES 1" };
      }
      if (numAmount > maxAmount) {
        return { field: "amount", message: `Maximum amount is KES ${maxAmount.toLocaleString()}` };
      }
      return null;
    },
  },

  // Password confirmation validation
  passwordConfirm: {
    validate: (password: string, confirm: string): ValidationError | null => {
      if (password !== confirm) {
        return { field: "confirm", message: "Passwords don't match" };
      }
      return null;
    },
  },
};

/**
 * Parse server error messages and extract user-friendly descriptions
 */
export function parseServerError(error: Error | string): string {
  const message = typeof error === "string" ? error : error.message;

  // Authentication errors
  if (message.includes("Invalid phone")) return "Incorrect phone number or password";
  if (message.includes("invalid password")) return "Incorrect password. Please try again.";
  if (message.includes("Phone must be 10 digits")) {
    return "Please enter a valid Kenyan phone number (07XX XXX XXX)";
  }
  if (message.includes("already exists")) {
    return "This phone number is already registered. Please log in instead.";
  }

  // PIN errors
  if (message.includes("Incorrect PIN")) return message; // Already user-friendly
  if (message.includes("Too many attempts")) return message; // Already user-friendly
  if (message.includes("locked")) return "Account locked due to too many attempts. Try again later.";

  // Till/Payment setup errors
  if (message.includes("Could not verify")) return "Could not verify till. Please check the number and try again.";
  if (message.includes("verification")) return "Could not verify till. Please check the number and try again.";

  // Subscription/Payment errors
  if (message.includes("subscription")) return "This shop is currently unavailable. Please contact the merchant.";
  if (message.includes("expired")) return "This shop subscription has expired.";

  // Network errors
  if (message.includes("Connection failed")) return "Connection failed. Please check your internet and try again.";
  if (message.includes("Network")) return "Network error. Please check your internet connection.";
  if (message.includes("timeout")) return "Request timed out. Please try again.";

  // Payment errors
  if (message.includes("Payment initiated but failed to record")) {
    return "Payment sent but we couldn't record it. Please contact support.";
  }
  if (message.includes("Failed to send M-Pesa")) return "Payment request failed. Please try again.";
  if (message.includes("M-Pesa")) return "M-Pesa error. Please try again or contact support.";

  // Generic fallbacks
  if (message.includes("not found")) return "Not found. Please try again.";
  if (message.includes("unauthorized")) return "You don't have permission to do this.";
  if (message.includes("failed")) return "Something went wrong. Please try again.";

  // Don't expose technical errors
  return "Something went wrong. Please try again.";
}

/**
 * Format a Kenyan phone number for display
 */
export function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, "").slice(-9);
  if (cleaned.length !== 9) return phone;
  return `0${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
}
