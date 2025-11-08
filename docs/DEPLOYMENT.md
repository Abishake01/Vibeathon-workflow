# Deployment Guide

## Building for Production

### 1. Build the Application

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

**Build Output:**
- Minified JavaScript
- Optimized CSS
- Compressed assets
- Source maps (optional)

### 2. Preview Production Build Locally

```bash
npm run preview
```

This serves the production build locally to test before deployment.

## Deployment Options

### Option 1: Vercel (Recommended for Quick Deploy)

Vercel offers the easiest deployment for Vite apps.

**Steps:**

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow prompts to link/create project

4. Production deploy:
```bash
vercel --prod
```

**Configuration:**

Create `vercel.json` (optional):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

**GitHub Integration:**
- Connect repository to Vercel
- Automatic deploys on git push
- Preview deployments for PRs

### Option 2: Netlify

**Via Netlify CLI:**

1. Install CLI:
```bash
npm i -g netlify-cli
```

2. Deploy:
```bash
netlify deploy --prod --dir=dist
```

**Via Netlify UI:**

1. Build command: `npm run build`
2. Publish directory: `dist`
3. Connect Git repository for auto-deploy

**Configuration:**

Create `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Option 3: GitHub Pages

**Steps:**

1. Install gh-pages:
```bash
npm install --save-dev gh-pages
```

2. Update `vite.config.js`:
```javascript
export default defineConfig({
  plugins: [react()],
  base: '/workflow-builder/', // Your repo name
})
```

3. Add deploy script to `package.json`:
```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

4. Deploy:
```bash
npm run deploy
```

5. Enable GitHub Pages in repository settings:
   - Settings → Pages
   - Source: gh-pages branch

### Option 4: Static Hosting (AWS S3, Azure, etc.)

**General Process:**

1. Build:
```bash
npm run build
```

2. Upload `dist/` contents to your static hosting service

3. Configure:
   - Set `index.html` as default document
   - Configure SPA routing (redirect all to index.html)

**AWS S3 + CloudFront Example:**

1. Create S3 bucket
2. Enable static website hosting
3. Upload dist/ contents
4. Set bucket policy for public read
5. Create CloudFront distribution
6. Point to S3 bucket

**Azure Static Web Apps:**

1. Create Static Web App resource
2. Connect to GitHub repository
3. Configure build:
   - App location: `/`
   - API location: `` (empty)
   - Output location: `dist`

### Option 5: Docker

**Create Dockerfile:**

```dockerfile
# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Create nginx.conf:**

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

**Build and Run:**

```bash
# Build image
docker build -t workflow-builder .

# Run container
docker run -p 8080:80 workflow-builder
```

**Docker Compose:**

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
```

## Environment Configuration

### Environment Variables

Create `.env.production`:

```env
VITE_API_URL=https://api.example.com
VITE_APP_VERSION=1.0.0
```

Access in code:
```javascript
const apiUrl = import.meta.env.VITE_API_URL;
```

### Build Optimization

**vite.config.js:**

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Optimize chunks
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'flow-vendor': ['@xyflow/react']
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Minify
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs
      }
    }
  }
})
```

## Performance Optimization

### 1. Code Splitting

```javascript
// Lazy load components
const ExecutionViewer = lazy(() => import('./components/ExecutionViewer'));

// Use with Suspense
<Suspense fallback={<Loading />}>
  <ExecutionViewer />
</Suspense>
```

### 2. Asset Optimization

- Compress images (use WebP)
- Minify SVGs
- Enable gzip/brotli compression

### 3. Caching Strategy

**Nginx example:**
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 4. CDN Configuration

- Host static assets on CDN
- Enable compression
- Use HTTP/2
- Configure proper cache headers

## Security Considerations

### 1. Content Security Policy

Add to `index.html`:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline';">
```

### 2. HTTPS

- Always use HTTPS in production
- Configure SSL/TLS certificates
- Redirect HTTP to HTTPS

### 3. Security Headers

**Nginx example:**
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
```

## Monitoring & Analytics

### 1. Error Tracking

**Sentry Integration:**

```bash
npm install @sentry/react
```

```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-dsn",
  environment: import.meta.env.MODE,
});
```

### 2. Analytics

**Google Analytics:**

```html
<!-- Add to index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_ID');
</script>
```

### 3. Performance Monitoring

Use Lighthouse CI for automated performance checks:

```bash
npm install -g @lhci/cli
```

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      url: ['http://localhost:4173'],
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

## CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --prod --dir=dist
        env:
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
```

## Post-Deployment Checklist

- [ ] Test all functionality in production
- [ ] Verify node library loads correctly
- [ ] Test workflow save/load
- [ ] Check execution engine works
- [ ] Test on different browsers
- [ ] Test on mobile devices
- [ ] Verify credentials system
- [ ] Check console for errors
- [ ] Test performance (Lighthouse score)
- [ ] Verify SSL certificate
- [ ] Check security headers
- [ ] Test 404 handling
- [ ] Verify analytics tracking
- [ ] Check error reporting works

## Rollback Strategy

### Quick Rollback

**Vercel:**
```bash
vercel rollback [deployment-url]
```

**Netlify:**
- Go to Deploys → Click on previous deploy → Publish

**GitHub Pages:**
```bash
git revert HEAD
git push
npm run deploy
```

**Docker:**
```bash
# Tag stable releases
docker tag workflow-builder:latest workflow-builder:1.0.0

# Rollback to previous version
docker run -p 8080:80 workflow-builder:1.0.0
```

## Backup & Recovery

### 1. Code Backup
- Use Git tags for releases
- Maintain multiple branches
- Regular backups of repository

### 2. User Data
- No server-side data in current version
- User workflows stored locally
- Credentials in browser localStorage
- Consider backup export feature

### 3. Database (Future)
If implementing backend:
- Regular database backups
- Point-in-time recovery
- Replication for high availability

## Scaling Considerations

### Current Architecture
- Static site: Scales infinitely on CDN
- No backend: No scaling needed
- Client-side only: No server costs

### Future Scaling (with Backend)

**Horizontal Scaling:**
- Load balancer (ALB, Nginx)
- Multiple app servers
- Shared session storage (Redis)
- Database read replicas

**Vertical Scaling:**
- Increase server resources
- Optimize database queries
- Cache frequently accessed data

**Caching Strategy:**
- CDN for static assets
- Redis for session data
- Database query caching
- API response caching

## Cost Estimation

### Free Tier Options
- **Vercel:** Free for personal projects
- **Netlify:** 100GB bandwidth/month free
- **GitHub Pages:** Free for public repos
- **Cloudflare Pages:** Unlimited bandwidth free

### Paid Hosting
- **Vercel Pro:** $20/month
- **Netlify Pro:** $19/month
- **AWS S3 + CloudFront:** $1-5/month (low traffic)
- **Digital Ocean App Platform:** $5/month

## Maintenance

### Regular Tasks
- Monitor error rates
- Check performance metrics
- Review security updates
- Update dependencies monthly
- Test backups regularly
- Review analytics data

### Dependency Updates

```bash
# Check outdated packages
npm outdated

# Update all dependencies
npm update

# Update major versions (carefully)
npm install react@latest
```

### Security Updates

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Review breaking changes
npm audit fix --force
```

---

Your workflow builder is now ready for production deployment! Choose the option that best fits your needs and follow the steps above.

