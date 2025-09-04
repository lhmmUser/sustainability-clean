// utils/api.ts

//const API_BASE_URL = 'https://happytummy.cognotools.dev';
// const API_BASE_URL = 'http://127.0.0.1:8000';
const API_BASE_URL = '/api'; 

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

// Main fetch function
export const fetchData = async (endpoint: string, method: string = 'GET', body: any = null): Promise<any> => {
  // Check if token is missing or expired
  if (!bearerToken || !tokenExpiryTime || Date.now() >= tokenExpiryTime) {
    await fetchBearerToken(); // Refresh the token
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${bearerToken}`, // Use the refreshed token
    },
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) {
    if (response.status === 401) {
      console.warn('Token invalid, fetching a new token...');
      await fetchBearerToken(); // Fetch a new token
      return fetchData(endpoint, method, body); // Retry
    }
    const errorText = await response.text();
    throw new Error(`Failed to fetch data: ${response.status} ${response.statusText} - ${errorText}`);
  }
  return await response.json();
};


