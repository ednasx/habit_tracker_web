// habit-service/utils/validation.js

/**
 * Validates that a string is a valid UUID format
 * @param {string} uuid - The UUID string to validate
 * @returns {boolean} - True if valid UUID format, false otherwise
 */
export function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuid && uuidRegex.test(uuid);
}

/**
 * Validates and throws an error if the UUID is invalid
 * @param {string} uuid - The UUID string to validate
 * @param {string} fieldName - Name of the field for error message (default: 'ID')
 * @throws {Error} - If UUID is invalid
 */
export function validateUUID(uuid, fieldName = 'ID') {
  if (!isValidUUID(uuid)) {
    throw new Error(`Invalid ${fieldName} format`);
  }
}
