/**
 * Helper function to extract request body for logging
 */
export async function getRequestBody(req: Request): Promise<unknown> {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      return Object.fromEntries(formData);
    } else if (contentType.includes("text/")) {
      return await req.text();
    }
    return null;
  } catch (e) {
    console.error("Error parsing request body:", e);
    return null;
  }
} 