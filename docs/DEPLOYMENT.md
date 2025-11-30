# Deployment Guide - Vercel Production Deployment

**Purpose:** Complete guide for deploying, testing, and securing the Satoshe Sluggers NFT marketplace on Vercel

---

## 🚀 Deployment Process

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your branch to GitHub:**
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

2. **Deploy via Vercel Dashboard:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Select your project (`satoshe-sluggers`)
   - Click "Deployments" tab
   - Click "Create Deployment" button
   - Select branch: `main` (or your branch)
   - Click "Deploy"

3. **Or: Vercel automatically creates preview deployments**
   - Vercel automatically creates preview deployments for every push to non-main branches
   - After pushing, check Vercel dashboard for the preview URL
   - Preview URL format: `satoshe-sluggers-git-[branch]-[username].vercel.app`

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Link to your project (if not already linked)
vercel link

# Deploy current branch
vercel --prod=false  # Creates preview deployment

# Deploy to production
vercel --prod
```

---

## 🔍 Testing the Preview Deployment

After deployment, you'll get a preview URL. Test:

1. ✅ Images load correctly on `/nfts` page
2. ✅ Wallet connection works
3. ✅ Purchase flow works
4. ✅ All links work
5. ✅ No console errors
6. ✅ Termly banner appears
7. ✅ CSP doesn't break functionality

---

## 🔒 Essential Security Settings

### 1. **Environment Variables** (Settings → Environment Variables)
- [ ] Verify all `NEXT_PUBLIC_*` vars are set for Production, Preview, and Development
- [ ] Remove any unused or old environment variables
- [ ] Enable "Protect" for sensitive values (if applicable)
- [ ] Required vars:
  - `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`
  - `NEXT_PUBLIC_NFT_COLLECTION_ADDRESS`
  - `NEXT_PUBLIC_MARKETPLACE_ADDRESS`
  - `NEXT_PUBLIC_CREATOR_ADDRESS`

### 2. **Bot Protection** (Settings → Security)
- [x] Enable Bot Protection
- [ ] Test wallet connections after enabling
- [ ] Monitor for false positives (legitimate users blocked)
- [ ] Adjust sensitivity if needed (Vercel Pro allows fine-tuning)

### 3. **DDoS Protection** (Automatic, but verify)
- [ ] Verify DDoS Protection is active (usually automatic on Pro)
- [ ] Check rate limiting settings in `vercel.json` if needed
- [ ] Monitor for abuse patterns in Vercel Analytics

### 4. **Access Control / Team Permissions**
- [ ] Review team member permissions (Settings → Team)
- [ ] Limit production deployment access to admins only
- [ ] Enable 2FA for all team members (if applicable)
- [ ] Review audit logs periodically (Vercel Pro includes this)

### 5. **Deployment Protection**
- [ ] Enable "Production Protection" (requires approval for production deploys)
- [ ] Set up deployment hooks/webhooks for notifications
- [ ] Enable "Vercel for Git" protection (prevent force pushes to main)

### 6. **Rate Limiting** (via `vercel.json` or Edge Config)
Add to `vercel.json` if you have API routes that need protection:
```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "regions": ["iad1"]  // US East for lower latency
}
```

### 7. **Domain & SSL Settings**
- [ ] Verify SSL/TLS certificates are active (automatic)
- [ ] Enable "Force HTTPS" redirects (should be automatic)
- [ ] Verify domain DNS settings are correct
- [ ] Enable HSTS (already configured in `next.config.mjs`)

### 8. **Preview Deployments Security**
- [ ] Enable "Vercel Authentication" for preview deployments (optional)
- [ ] Set preview deployment retention (Settings → Git)
- [ ] Configure preview deployment notifications

### 9. **Analytics & Monitoring**
- [x] Speed Insights enabled (already added)
- [x] Analytics enabled (already enabled)
- [ ] Set up alerts for unusual traffic patterns
- [ ] Monitor error rates in Vercel dashboard

### 10. **Content Security Policy** (Already configured in code)
- [x] CSP headers set in `next.config.mjs` ✅
- [ ] Monitor CSP violations in browser console after deployment
- [ ] Adjust CSP as needed based on violations

---

## 🚨 Critical Security Items (Do First)

1. **Environment Variables** - Verify all are set correctly
2. **Bot Protection** - Enable and test
3. **Access Control** - Review team permissions
4. **Deployment Protection** - Enable production protection
5. **Rate Limiting** - Verify API routes have proper limits

---

## 📋 Critical Pre-Deployment Testing

**Critical Functions (Buy, Wallet, Sold State):**
- Must be tested **AT LEAST 3 TIMES** before deployment
- Test with different NFTs, different scenarios
- Document any issues encountered

### Essential Tests:

1. **Wallet Connection** (Test 3+ times)
   - [ ] Connect button opens wallet modal
   - [ ] MetaMask connection works
   - [ ] Wallet reconnects on page refresh
   - [ ] Disconnect functionality works

2. **NFT Purchase** (Test 3+ times - CRITICAL)
   - [ ] "Buy Now" button visible on live NFTs
   - [ ] Wallet popup appears on purchase
   - [ ] Transaction submits successfully
   - [ ] Success modal appears
   - [ ] NFT detail page updates immediately
   - [ ] "Buy Now" button disappears
   - [ ] Grid updates to show "Sold" state
   - [ ] Live/Sold counts update correctly

3. **Sold State Display** (Test 3+ times)
   - [ ] Sold NFTs show "Sold" (green) in grid
   - [ ] Sold NFT detail page shows "Purchased for" (green)
   - [ ] Owner address displays correctly
   - [ ] Sold state persists after page refresh

4. **Termly Cookie Consent**
   - [ ] Banner appears on first page load
   - [ ] Accept/Decline buttons work
   - [ ] Banner doesn't reappear after accepting
   - [ ] Preferences modal opens correctly

5. **Images & Links**
   - [ ] All NFT images load correctly
   - [ ] No broken image placeholders
   - [ ] All legal links work (footer)
   - [ ] Contract links work (BaseScan, Blockscout)

6. **Filtering & Search**
   - [ ] Filters persist when navigating
   - [ ] Sorting works correctly
   - [ ] Search functionality works
   - [ ] Filter combinations work together

7. **Console Errors**
   - [ ] No errors on homepage
   - [ ] No errors on /nfts page
   - [ ] No errors during purchase flow
   - [ ] No CSP violations

---

## 🔄 When Ready to Deploy to Production

1. **Test thoroughly on preview deployment**
2. **Fix any issues found**
3. **Commit fixes to branch**
4. **Push to GitHub**
5. **Merge to main when ready:**
   ```bash
   git checkout main
   git merge [your-branch]
   git push origin main
   ```
6. **Vercel will automatically deploy main to production**

---

## ✅ Final Pre-Deployment Checks

### Build & Deployment
- [ ] `pnpm build` succeeds locally with zero errors
- [ ] All TypeScript errors resolved
- [ ] All ESLint warnings resolved (or acceptable)
- [ ] Latest code committed to GitHub
- [ ] Vercel deployment succeeds
- [ ] Production URL accessible
- [ ] SSL certificate valid (green lock icon)

### Production Environment
- [ ] All environment variables set in Vercel
- [ ] Environment variables are correct (not test values)
- [ ] Domain is configured correctly
- [ ] DNS records are correct

### Final Smoke Test
- [ ] Homepage loads correctly in production
- [ ] Wallet connection works in production
- [ ] NFT grid loads in production
- [ ] At least one purchase works end-to-end in production
- [ ] No console errors in production

---

## ⚠️ Things to Watch Out For

1. **False Positives from Bot Protection:**
   - Some wallet extensions might be flagged
   - Test thoroughly after enabling
   - Adjust sensitivity if needed

2. **Rate Limiting:**
   - Don't make limits too strict (could block legitimate users)
   - Monitor for abuse patterns

3. **Environment Variables:**
   - Don't expose secrets in client-side code
   - Use `NEXT_PUBLIC_*` only for public values
   - Keep sensitive vars server-side only

---

## 📚 Additional Resources

- [Vercel Security Best Practices](https://vercel.com/docs/security)
- [Vercel Pro Features](https://vercel.com/docs/pro)
- [Next.js Security Headers](https://nextjs.org/docs/app/api-reference/next-config-js/headers)

---

**Note:** Never merge to main until all tests pass on preview deployment!

