#!/usr/bin/env node
/**
 * Setup Render Environment Variables for Aurion Chat
 * 
 * Usage:
 *   node setup-render-env.js <RENDER_API_KEY>
 * 
 * Get your Render API key at: https://dashboard.render.com/settings#api-keys
 * 
 * This script sets the following env vars on your Render backend:
 *   - CONFIG_PATH: Points to hosted librechat.yaml on Vercel
 *   - OPENROUTER_KEY: OpenRouter API key for AI models
 *   - APP_TITLE: Aurion Chat branding
 */

const https = require('https');

const RENDER_API_KEY = process.argv[2];
if (!RENDER_API_KEY) {
  console.error('Usage: node setup-render-env.js <RENDER_API_KEY>');
  console.error('Get your key at: https://dashboard.render.com/settings#api-keys');
  process.exit(1);
}

const SERVICE_DOMAIN = 'librechat-api-ew3n.onrender.com';

const ENV_VARS = [
  { key: 'CONFIG_PATH', value: 'https://client-gold-zeta.vercel.app/librechat.yaml' },
  { key: 'OPENROUTER_KEY', value: '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' },
  { key: 'APP_TITLE', value: 'Aurion Chat' },
];

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.render.com',
      path: `/v1${path}`,
      method,
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🔍 Finding Render service...');

  // List services to find the one matching our domain
  const { status, data } = await request('GET', '/services?type=web_service&limit=50');
  if (status !== 200) {
    console.error(`Failed to list services (${status}):`, data);
    process.exit(1);
  }

  const services = Array.isArray(data) ? data : [];
  const service = services.find(s => {
    const svc = s.service || s;
    return svc.serviceDetails?.url?.includes(SERVICE_DOMAIN) ||
           svc.name?.includes('librechat');
  });

  if (!service) {
    console.error('Could not find the LibreChat service on Render.');
    console.error('Available services:', services.map(s => (s.service || s).name).join(', '));
    process.exit(1);
  }

  const serviceId = (service.service || service).id;
  const serviceName = (service.service || service).name;
  console.log(`✅ Found service: ${serviceName} (${serviceId})`);

  // Set env vars
  console.log('📝 Setting environment variables...');
  const putResult = await request('PUT', `/services/${serviceId}/env-vars`, ENV_VARS);

  if (putResult.status === 200) {
    console.log('✅ Environment variables set successfully!');
    console.log('');
    for (const v of ENV_VARS) {
      const display = v.key === 'OPENROUTER_KEY' ? v.value.substring(0, 20) + '...' : v.value;
      console.log(`   ${v.key} = ${display}`);
    }
    console.log('');
    console.log('🔄 Render will automatically restart the service.');
    console.log('   Wait 1-2 minutes, then refresh https://client-gold-zeta.vercel.app');
  } else {
    console.error(`Failed to set env vars (${putResult.status}):`, putResult.data);
  }
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
