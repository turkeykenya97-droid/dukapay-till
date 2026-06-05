# PWA Implementation for DukaPOS

This document outlines the Progressive Web App (PWA) implementation for DukaPOS.

## Overview

DukaPOS now supports full PWA functionality, allowing users to install it on their devices like a native app with offline support.

## What's Implemented

### 1. **Service Worker (`public/sw.js`)**
- Caches static assets on first visit
- Serves cached assets when offline
- Network-first strategy for API calls
- Never caches SmartPay webhooks or Supabase calls
- Shows offline page when user has no connection

### 2. **Web App Manifest (`public/manifest.json`)**
- Defines app metadata (name, icons, colors)
- Includes shortcuts for quick access (New Sale, View History)
- Sets standalone display mode for app-like feel
- Green theme color (#16a34a) matching DukaPOS branding

### 3. **PWA Icons (`public/icons/`)**
- 192x192 and 512x512 adaptive icons
- Maskable icons for icon shape adaptation
- SVG format for scalability
- Green DukaPOS till design

### 4. **Offline Experience**
- `public/offline.html` - Branded offline page
- Auto-retry connection every 30 seconds
- Retry button for user-initiated reconnection
- Tips for troubleshooting network issues

### 5. **Installation UI**
- `PWAInstallPrompt` component in navbar
- Detects when browser supports installation
- Shows "Install App" button on eligible devices
- Hidden on already-installed instances
- Auto-dismiss on installation

### 6. **Head Meta Tags** (`src/routes/__root.tsx`)
- Theme color for status bar
- Apple mobile web app support
- Manifest link and icons
- Mobile-friendly viewport settings

## Supported Platforms

### Android
- **Chrome/Edge**: Full support (Install button + add to home screen)
- **Samsung Internet**: Full support
- **Firefox**: Limited (add to home screen only)

### iOS
- **Safari**: Add to Home Screen support
- Installation via Share > Add to Home Screen
- Standalone mode works
- Limited offline caching on some versions

### Desktop
- **Chrome/Edge**: Install button available
- **Windows**: Creates Start menu shortcut
- **macOS**: Creates Applications folder entry

## Browser Requirements

- Service Workers support
- Cache API support
- Promise/async-await support

Modern browsers (Chrome 51+, Firefox 44+, Safari 12.2+, Edge 17+)

## Offline Behavior

### What Works Offline
- ✅ All cached UI pages (Dashboard, History, Products, etc.)
- ✅ Navigation between cached pages
- ✅ Viewing previously cached data

### What Doesn't Work Offline
- ❌ M-Pesa STK push (requires live network)
- ❌ Supabase queries (database operations)
- ❌ Real-time transaction processing
- ❌ Authentication checks
- Shows offline page with retry option

## Service Worker Strategy

### Static Assets (Cache-First)
- HTML, CSS, JavaScript bundles
- Font files
- Images and SVG icons
- Returns cached version if available, fetches fresh on next online

### API Calls (Network-First)
- `/_serverFn/*` - TanStack Start server functions
- `/api/*` - Custom API routes
- Always tries network first
- Falls back to cached response if offline
- Shows offline page if no cache exists

### Never Cached
- SmartPay webhook responses (`/api/public/webhooks/smartpay`)
- Supabase API calls
- Authentication tokens
- Real-time payment data

## File Structure

```
public/
├── manifest.json          # PWA metadata
├── sw.js                  # Service worker
├── offline.html          # Offline fallback page
└── icons/
    ├── icon-192.svg      # Regular 192x192 icon
    ├── icon-512.svg      # Regular 512x512 icon
    ├── icon-192-maskable.svg  # Adaptive 192x192
    └── icon-512-maskable.svg  # Adaptive 512x512

src/
├── components/
│   └── pwa-install-prompt.tsx  # Install UI component
└── routes/
    └── __root.tsx        # Service worker registration & meta tags
```

## Testing PWA Functionality

### Test Installation
1. Open DukaPOS in Chrome/Edge on Android or Desktop
2. Look for "Install app" prompt or menu
3. Click install
4. App should appear on home screen or Start menu

### Test Offline Mode
1. Open DevTools (F12)
2. Go to Application > Service Workers
3. Check "Offline" box
4. Navigate around cached pages (works)
5. Try to make API calls (offline page shown)
6. Uncheck offline, click retry (reconnects)

### Test Service Worker Updates
- New versions are checked every 60 seconds
- Automatically downloaded and cached
- Updated on next page reload

## Build and Deployment

### Build Process
```bash
bun run build
```

This will:
1. Compile TypeScript
2. Bundle React components with Vite
3. Copy public files to dist/client
4. Generate service worker
5. Create optimized assets

### Cloudflare Deployment
```bash
wrangler deploy
```

Files served by Cloudflare Workers:
- `manifest.json` at `/manifest.json`
- `sw.js` at `/sw.js` (important: must not be cached)
- `offline.html` at `/offline.html`
- Icons at `/icons/*`

### Important Notes
- Service worker file (`sw.js`) should have `Cache-Control: no-cache` headers
- Manifest should be accessible without authentication
- Icons should be served with appropriate CORS headers
- All static assets should be cached with long-lived headers

## Troubleshooting

### Service Worker Not Registering
- Check browser console for errors
- Verify `/sw.js` is accessible
- Clear browser cache and service workers
- Ensure HTTPS is used (PWA requires secure context)

### App Not Installable
- Must be on HTTPS (localhost works for testing)
- Manifest must be valid JSON
- App icon must be at least 192x192
- Display must be "standalone"

### Offline Page Not Showing
- Check Service Worker status in DevTools
- Verify offline.html is accessible
- Check cache storage (Application > Cache Storage)
- Ensure offline event listener is working

### Payment Processing Issues
- M-Pesa payments require live network connection
- Service worker will show offline page if no connection
- No caching of payment transactions
- Session/authentication data is not cached

## Security Considerations

- ✅ All authentication cookies preserved (not cached)
- ✅ No sensitive data cached (API keys, tokens)
- ✅ Payment processing never cached
- ✅ CORS headers respected
- ✅ HTTPS-only in production

## Future Enhancements

1. **Background Sync**
   - Queue failed transactions for retry when online
   - Sync local changes with server

2. **Push Notifications**
   - Payment confirmations
   - Sale alerts
   - Subscription reminders

3. **Advanced Offline Features**
   - Local product database caching
   - Draft transactions saved locally
   - Offline transaction logging

4. **Analytics**
   - Track installation events
   - Monitor cache hits/misses
   - Analyze offline usage

## Performance Metrics

Expected improvements:
- **First load**: +10-15% faster (cached assets)
- **Repeat visits**: +30-50% faster (service worker cache)
- **Offline navigation**: Instant (cached pages)
- **Connection time**: 0ms-500ms (cached responses)

## Support

For issues or questions about PWA functionality:
1. Check browser console for errors
2. Review Service Worker status (DevTools > Application)
3. Clear cache and re-register service worker
4. Test on different browsers/devices
