import webpush from 'web-push';

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  
  if (!publicKey || !privateKey) {
    return new Response(JSON.stringify({ error: 'VAPID keys not configured on server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  webpush.setVapidDetails(
    'mailto:support@petplantpro.example.com',
    publicKey,
    privateKey
  );
  
  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  const { hogarId, title, body: pushBody } = body;
  if (!hogarId || !title || !pushBody) {
    return new Response(JSON.stringify({ error: 'Missing required fields: hogarId, title, body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  const idToken = authHeader?.split('Bearer ')[1];
  
  if (!idToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Missing ID token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || "plants-and-pets-app";
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
    
    const queryPayload = {
      structuredQuery: {
        from: [{ collectionId: 'push_subscriptions' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'hogarId' },
            op: 'EQUAL',
            value: { stringValue: hogarId }
          }
        }
      }
    };
    
    const firestoreResponse = await fetch(firestoreUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify(queryPayload)
    });
    
    if (!firestoreResponse.ok) {
      const errText = await firestoreResponse.text();
      return new Response(JSON.stringify({ error: `Failed to query subscriptions from Firestore: ${errText}` }), {
        status: firestoreResponse.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const queryResults = await firestoreResponse.json();
    
    const subscriptions: any[] = [];
    if (Array.isArray(queryResults)) {
      for (const result of queryResults) {
        if (result.document && result.document.fields) {
          const fields = result.document.fields;
          if (fields.subscription && fields.subscription.mapValue && fields.subscription.mapValue.fields) {
            const subFields = fields.subscription.mapValue.fields;
            
            const endpoint = subFields.endpoint?.stringValue;
            const p256dh = subFields.keys?.mapValue?.fields?.p256dh?.stringValue;
            const authKey = subFields.keys?.mapValue?.fields?.auth?.stringValue;
            
            if (endpoint && p256dh && authKey) {
              subscriptions.push({
                endpoint,
                keys: {
                  p256dh,
                  auth: authKey
                }
              });
            }
          }
        }
      }
    }
    
    if (subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'No subscriptions found for this hogarId' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const payload = JSON.stringify({ title, body: pushBody });
    const sendPromises = subscriptions.map(sub => 
      webpush.sendNotification(sub, payload)
        .catch(err => {
          console.error(`Failed to send notification to ${sub.endpoint}:`, err);
        })
    );
    
    await Promise.all(sendPromises);
    
    return new Response(JSON.stringify({ success: true, count: subscriptions.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Internal server error sending notifications' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
