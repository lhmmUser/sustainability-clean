const API_BASE_URL = "http://127.0.0.1:8000";
//const API_BASE_URL = "https://happytummy.cognotools.dev";

let bearerToken: string | null = null; // Store the token in memory
let tokenExpiryTime: number | null = null; // Track when the token expires

// Function to fetch a new bearer token
const fetchBearerToken = async () => {
  const response = await fetch(`${API_BASE_URL}/generate-bearer-token`, {
    method: "POST",
    body: JSON.stringify({ api_key: "9b05c2f3302844b5b3a0930312399cd8" }),
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch bearer token: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const { data } = await response.json();
  bearerToken = data.bearer_token;
  tokenExpiryTime = Date.now() + 29 * 60 * 1000; // Set expiry time to 29 minutes from now
};

export const apiRequest = async (
  endpoint: string,
  method: string = "GET",
  body: object = {},
  onChunkReceived?: (chunk: string) => void
): Promise<{ success: boolean; error?: string; data?: any }> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

  try {
    // Check if token is missing or expired
    if (!bearerToken || !tokenExpiryTime || Date.now() >= tokenExpiryTime) {
      await fetchBearerToken(); // Refresh the token
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
      body: method !== "GET" ? JSON.stringify(body) : null,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 401) {
        console.warn("Token invalid, fetching a new token...");
        await fetchBearerToken(); // Fetch a new token
        return apiRequest(endpoint, method, body, onChunkReceived); // Retry
      }
      const errorDetails = await res.text();
      throw new Error(`API request failed: ${errorDetails}`);
    }

    if (onChunkReceived && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        onChunkReceived(decoder.decode(value, { stream: true }));
      }
      return { success: true };
    }

    return await res.json();
  } catch (error: any) {
    console.error("Error during API request:", error);
    return { success: false, error: error.message };
  }
};
