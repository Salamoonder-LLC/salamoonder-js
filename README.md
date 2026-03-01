# Salamoonder JS

A straightforward JavaScript wrapper for Salamoonder's API, designed for easy integration and usage. Perfect for solving captchas and bypassing bot detection on various platforms.

## Features

- 🚀 Simple and intuitive API
- 🔧 Support for multiple captcha types:
  - Akamai Web Sensor
  - Akamai SBSD
  - Kasada
  - DataDome (Slider & Interstitial)
  - Incapsula/imperva
  - Twitch Public Integrity
- 📝 Full TypeScript-like JSDoc support
- 🧪 Comprehensive test suite
- 🔌 Modular architecture with individual exports

## Installation

```bash
npm install salamoonder-js
```

## Requirements

- Node.js >= 16.0.0

## Quick Start

```javascript
import Salamoonder from 'salamoonder-js';

const client = new Salamoonder('YOUR_API_KEY');

// Create and solve a Kasada captcha task
const taskId = await client.task.createTask('KasadaCaptchaSolver', {
  pjs_url: 'https://example.com/script.js',
  cd_only: false,
});

// Poll for the result
const solution = await client.task.getTaskResult(taskId);
console.log('Solution:', solution);
```

## Usage Examples

### Akamai Web Sensor

```javascript
const client = new Salamoonder('YOUR_API_KEY');

const taskId = await client.task.createTask('AkamaiWebSensorSolver', {
  url: 'https://example.com',
  abck: 'abck_cookie_value',
  bmsz: 'bmsz_cookie_value',
  script: 'sensor_script_content',
  sensor_url: 'https://sensor.example.com/sensor.js',
  count: 5,
  data: 'sensor_data',
  user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...'
});

const result = await client.task.getTaskResult(taskId, 2); // Poll every 2 seconds
console.log('Result:', result);
```

### Kasada

```javascript
const client = new Salamoonder('YOUR_API_KEY');

// Kasada Captcha
const captchaTaskId = await client.task.createTask('KasadaCaptchaSolver', {
  pjs_url: 'https://example.com/script.js',
  cd_only: true,
});
const captchaResult = await client.task.getTaskResult(captchaTaskId);

// Kasada Payload
const payloadTaskId = await client.task.createTask('KasadaPayloadSolver', {
  url: 'https://example.com',
  script_content: 'script_content_here',
  script_url: 'https://example.com/script.js'
});
const payloadResult = await client.task.getTaskResult(payloadTaskId);
```

### DataDome

```javascript
const client = new Salamoonder('YOUR_API_KEY');

// Slider captcha
const sliderTaskId = await client.task.createTask('DataDomeSliderSolver', {
  captcha_url: 'https://captcha.example.com/slider',
  country_code: 'US',
  user_agent: 'Mozilla/5.0...'
});
const sliderResult = await client.task.getTaskResult(sliderTaskId);

// Interstitial captcha
const interstitialTaskId = await client.task.createTask('DataDomeInterstitialSolver', {
  captcha_url: 'https://captcha.example.com/interstitial',
  country_code: 'US'
});
const interstitialResult = await client.task.getTaskResult(interstitialTaskId);
```

### Direct Client Methods

For custom HTTP requests with TLS client impersonation:

```javascript
const client = new Salamoonder('YOUR_API_KEY');

// GET request
const response = await client.get('https://example.com', {
  headers: { 'User-Agent': 'Custom UA' },
  proxy: 'http://proxy:port'
});

// POST request
const postResponse = await client.post('https://example.com/api', {
  json: { key: 'value' },
  headers: { 'Content-Type': 'application/json' }
});
```

## API Reference

### Salamoonder Class

Main entry point for the library.

```javascript
const salamoonder = new Salamoonder(apiKey, baseUrl?, impersonate?);
```

**Parameters:**
- `apiKey` (string) - Your Salamoonder API key (required)
- `baseUrl` (string) - API base URL (default: `https://salamoonder.com/api`)
- `impersonate` (string) - TLS client identifier to impersonate (default: `chrome_133`)

**Properties:**
- `task` - Tasks API instance (recommended for solving captchas)
- `akamai`, `akamai_sbsd`, `datadome`, `kasada` - Low-level solver instances (advanced use only)
- `session` - Session information and cookies

**Methods:**
- `get(url, options)` - Make a GET request
- `post(url, options)` - Make a POST request

### Supported Captcha Types

- `KasadaCaptchaSolver`
- `KasadaPayloadSolver`
- `AkamaiWebSensorSolver`
- `AkamaiSBSDSolver`
- `DataDomeSliderSolver`
- `DataDomeInterstitialSolver`
- `IncapsulaReese84Solver`
- `IncapsulaUTMVCSolver`
- `Twitch_PublicIntegrity`

## Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm test:watch
```

Generate coverage report:

```bash
npm test:coverage
```

## Module Exports

You can import individual modules if needed:

```javascript
// Main class and main exports
import Salamoonder, { Tasks, Client } from 'salamoonder-js';

// Error classes
import { APIError, MissingAPIKeyError, SalamoonderSession } from 'salamoonder-js';

// For advanced/low-level operations only
import { AkamaiWeb, AkamaiSBSD } from 'salamoonder-js/utils/akamai';
import { Datadome } from 'salamoonder-js/utils/datadome';
import { Kasada } from 'salamoonder-js/utils/kasada';
```

**Note:** The utility classes (`AkamaiWeb`, `AkamaiSBSD`, `Datadome`, `Kasada`) are for low-level operations. For most use cases, use the Tasks API through the main client.

## Error Handling

```javascript
import Salamoonder, { APIError, MissingAPIKeyError } from 'salamoonder-js';

try {
  const client = new Salamoonder('YOUR_API_KEY');
  const taskId = await client.task.createTask('KasadaCaptchaSolver', {
    pjs_url: 'https://example.com/script.js',
    cd_only: false,
  });
  const result = await client.task.getTaskResult(taskId);
} catch (error) {
  if (error instanceof MissingAPIKeyError) {
    console.error('API key is required');
  } else if (error instanceof APIError) {
    console.error('API error:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## License

GPL-3.0 - See LICENSE file for details

## Support

For issues, feature requests, or questions, please visit:
https://github.com/Salamoonder-LLC/salamoonder-js
