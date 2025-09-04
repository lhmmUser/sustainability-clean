//const API_BASE_URL = "https://happytummy.cognotools.dev";
const API_BASE_URL = '/api';


export type Message = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
}

let bearerToken: string | null = null; // Store the token in memory
let tokenExpiryTime: number | null = null; // Track when the token expires

// Function to fetch a new bearer token
const fetchBearerToken = async () => {
  const response = await fetch(`${API_BASE_URL}/generate-bearer-token`, {
    method: 'POST',
    body: JSON.stringify({ api_key: "8ad7be87218b415babe063c381099b62"}),
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch bearer token: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const {data} = await response.json();
  console.log(data);
  bearerToken = data.bearer_token;
  tokenExpiryTime = Date.now() + 29 * 60 * 1000; // Set expiry time to 29 minutes from now
};

export const sendMessage = async (
  message: string,
  onChunkReceived?: (chunk: string) => void
): Promise<{ success: boolean; error?: string }> => {
  try {
        // Check if token is missing or expired
    if (!bearerToken || !tokenExpiryTime || Date.now() >= tokenExpiryTime) {
      await fetchBearerToken(); // Refresh the token
    }
    const response = await fetch(`${API_BASE_URL}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`, 
      },
      body: JSON.stringify({
        user_id: "default-user",
        session_id: "default-session",
        name: "User",
        age: "25",
        gender: "unknown",
        city: "unknown",
        incoming_message: message
      }),
    });
    console.log(response);
    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Token invalid, fetching a new token...');
        await fetchBearerToken(); // Fetch a new token
        return sendMessage(message, onChunkReceived); // Retry
      }
      throw new Error('Network response was not ok');
    }

    if (onChunkReceived && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let previousChunk = ''; // To store the last processed chunk

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });

        // Call `onChunkReceived` for the previous chunk
        if (previousChunk) {
          onChunkReceived(previousChunk);
        }
        
        // Store the current chunk as the last processed chunk
        previousChunk = chunk;
      }
      
      // Discard the last chunk (do not call `onChunkReceived` here)
      return { success: true };
    }

    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

