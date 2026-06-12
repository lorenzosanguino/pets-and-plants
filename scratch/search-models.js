const apiKey = "AIzaSyACfoSHo-n4fuWLW1sSrz1qh1xb9jvDfSc";

async function listAllModels() {
  let endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const models = [];
  
  try {
    while (endpoint) {
      const response = await fetch(endpoint);
      const data = await response.json();
      if (data.models) {
        models.push(...data.models);
      }
      if (data.nextPageToken) {
        endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageToken=${data.nextPageToken}`;
      } else {
        endpoint = null;
      }
    }
    
    console.log("Modelos que contienen 'flash' o 'pro':");
    const filtered = models.filter(m => m.name.includes('flash') || m.name.includes('pro'));
    for (const m of filtered) {
      console.log(`- ${m.name} (${m.displayName})`);
    }
  } catch (err) {
    console.error("Excepción:", err);
  }
}

listAllModels();
