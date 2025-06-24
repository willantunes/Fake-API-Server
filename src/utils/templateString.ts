/**
 * Helper function to process template strings
 */
export function processTemplateString(template: string): string {
  const currentDate = new Date();

  return template.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
    const trimmed = variable.trim();

    // Date and time variables
    if (trimmed === "date") {
      return currentDate.toISOString();
    }
    if (trimmed === "timestamp") {
      return String(Date.now());
    }
    if (trimmed === "dateFormatted") {
      return currentDate.toLocaleDateString();
    }
    if (trimmed === "timeFormatted") {
      return currentDate.toLocaleTimeString();
    }

    // Random variables
    if (trimmed === "uuid") {
      return crypto.randomUUID();
    }
    if (trimmed === "randomInt") {
      return String(Math.floor(Math.random() * 1000));
    }
    if (trimmed.startsWith("randomInt(") && trimmed.endsWith(")")) {
      const range = trimmed.substring(10, trimmed.length - 1).split(",");
      const min = parseInt(range[0]) || 0;
      const max = parseInt(range[1]) || 100;
      return String(Math.floor(Math.random() * (max - min + 1)) + min);
    }

    // Request variables - these would require the request object
    if (trimmed.startsWith("req.")) {
      const reqVar = trimmed.substring(4);
      if (reqVar === "method") {
        return "GET"; // Placeholder - should use actual request method
      }
      if (reqVar === "path") {
        return "/path"; // Placeholder - should use actual path
      }
      // Add more req variables as needed
    }

    // Return unchanged if no match
    return match;
  });
} 