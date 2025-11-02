# Privacy Policy Update - Wallet Address Collection

## Legal Information

**Date:** October 2024  
**Purpose:** Document wallet address collection for favorites feature

---

## What You Need to Add to Your Privacy Policy

Add this section to your Privacy Policy at `https://retinaldelights.io/privacy`:

### Suggested Text:

**"Wallet Address Collection for Favorites**

When you connect your cryptocurrency wallet to our marketplace, we collect and store your wallet address (a public blockchain identifier) to provide the following services:

- **Favorites Storage**: We store your wallet address along with your favorited NFTs to enable cross-device synchronization of your favorites. This allows you to access your favorited items from any device when using the same wallet.

- **Data Storage**: Your wallet address and favorite preferences are stored in our secure database (Supabase) and are associated with your wallet address only. We do not collect any other personal information unless you explicitly provide it.

- **Public Nature of Wallet Addresses**: Please note that wallet addresses are public information on the blockchain and are not considered personally identifiable information (PII) under most privacy regulations. However, we treat your wallet address data with appropriate security measures.

- **Data Access**: Only wallet addresses you connect can access favorites associated with that address. We do not share wallet addresses with third parties except as necessary to provide the favorites synchronization service.

- **Data Retention**: Your favorites data is retained as long as your account (wallet connection) is active. You can delete favorites at any time, and all associated data will be removed from our systems.

- **User Consent**: By connecting your wallet and using the favorites feature, you consent to our collection and storage of your wallet address for the purposes described above."

---

## How Consent Works

**Automatic Consent via Wallet Connection:**

When users connect their wallet via Thirdweb's ConnectButton:
1. They see your Privacy Policy and Terms of Service links in the modal
2. They must accept terms to proceed (handled by Thirdweb)
3. This constitutes consent for wallet connection and associated data collection
4. Your Privacy Policy should already cover wallet address collection (add the text above)

**No Additional Prompts Needed** - The wallet connection modal serves as the consent mechanism.

---

## Cross-Browser Functionality

**Yes, favorites will sync across browsers** because:
- Favorites are stored by wallet address in Supabase database
- Same wallet address = same favorites data
- Works on desktop, mobile, different browsers
- Works across devices (as long as they use the same wallet)

**How it works:**
1. User connects wallet on Device A (e.g., Chrome desktop)
2. Favorites stored in database by wallet address
3. User connects same wallet on Device B (e.g., Safari mobile)
4. Same wallet address = same favorites loaded from database

---

## Legal Compliance

✅ **GDPR**: Wallet addresses are not PII, but disclosure is recommended  
✅ **CCPA**: Similar treatment - disclosure recommended but not required as PII  
✅ **Best Practice**: Always disclose what data you collect (transparency)

**Recommendation:** Add the section above to your Privacy Policy before deploying the favorites feature.

