export async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3, backoff = 1000): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      // Wait for backoff * (i + 1) milliseconds before retrying
      await new Promise(res => setTimeout(res, backoff * (i + 1)));
    }
  }
}

export async function fetchWithCache(url: string, cacheKey: string, ttl = 86400000): Promise<any> {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < ttl) {
        // Return cached data immediately, but fetch in background to update cache
        fetchWithRetry(url).then(newData => {
          localStorage.setItem(cacheKey, JSON.stringify({ data: newData, timestamp: Date.now() }));
        }).catch(() => {}); // Ignore background fetch errors
        return data;
      }
    }
  } catch (e) {
    console.warn('Cache read error:', e);
  }

  const data = await fetchWithRetry(url);
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    console.warn('Cache write error:', e);
  }
  return data;
}
