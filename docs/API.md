# 📡 API Documentation

**Base URL:** `/api`  
**Authentication:** Wallet address-based (no traditional auth required)

---

## Favorites API

### GET /api/favorites

Get all favorite NFTs for a wallet address.

**Query Parameters:**
- `walletAddress` (required): Ethereum wallet address (0x...)

**Request Example:**
```
GET /api/favorites?walletAddress=0x1234567890123456789012345678901234567890
```

**Response:**
```json
{
  "success": true,
  "favorites": [
    {
      "tokenId": "123",
      "name": "Satoshe Slugger #123",
      "image": "https://...",
      "rarity": "Legendary",
      "rank": "1",
      "rarityPercent": "0.01",
      "addedAt": "2024-11-15T10:30:00Z"
    }
  ]
}
```

**Error Responses:**
- `400`: Missing or invalid wallet address
  ```json
  {
    "success": false,
    "error": "Missing walletAddress parameter"
  }
  ```
- `500`: Server error
  ```json
  {
    "success": false,
    "error": "Failed to fetch favorites"
  }
  ```

---

### POST /api/favorites

Add an NFT to favorites.

**Request Body:**
```json
{
  "walletAddress": "0x1234567890123456789012345678901234567890",
  "tokenId": "123",
  "name": "Satoshe Slugger #123",
  "image": "https://...",
  "rarity": "Legendary",
  "rank": "1",
  "rarityPercent": "0.01"
}
```

**Response:**
```json
{
  "success": true,
  "favorite": {
    "tokenId": "123",
    "name": "Satoshe Slugger #123",
    "image": "https://...",
    "rarity": "Legendary",
    "rank": "1",
    "rarityPercent": "0.01",
    "addedAt": "2024-11-15T10:30:00Z"
  }
}
```

**Error Responses:**
- `400`: Missing required fields or invalid wallet address
- `409`: NFT already favorited
  ```json
  {
    "success": false,
    "error": "NFT is already favorited"
  }
  ```
- `500`: Server error

---

### DELETE /api/favorites/[tokenId]

Remove an NFT from favorites.

**Path Parameters:**
- `tokenId` (required): NFT token ID

**Query Parameters:**
- `walletAddress` (required): Ethereum wallet address (0x...)

**Request Example:**
```
DELETE /api/favorites/123?walletAddress=0x1234567890123456789012345678901234567890
```

**Response:**
```json
{
  "success": true,
  "message": "Favorite removed successfully"
}
```

**Error Responses:**
- `400`: Missing wallet address or token ID
- `500`: Server error

---

## Contact API

### POST /api/contact

Submit contact form message.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Question about NFTs",
  "message": "I have a question..."
}
```

**Response:**
```json
{
  "message": "Email sent successfully",
  "id": "email-id-123"
}
```

**Error Responses:**
- `400`: Missing required fields or invalid email format
  ```json
  {
    "error": "All fields are required"
  }
  ```
- `500`: Server error (email service failure)

---

## Authentication API (SIWE)

### GET /api/auth/siwe

Generate a Sign-In with Ethereum (SIWE) login payload.

**Query Parameters:**
- `address` (required): Ethereum wallet address (0x...)

**Request Example:**
```
GET /api/auth/siwe?address=0x1234567890123456789012345678901234567890
```

**Response:**
```json
{
  "payload": "example.com wants you to sign in with your Ethereum account:\n0x1234...\n\nURI: https://example.com\nVersion: 1\nChain ID: 8453\nNonce: abc123\nIssued At: 2024-11-15T10:30:00Z\nExpiration Time: 2024-11-15T11:30:00Z"
}
```

**Error Responses:**
- `400`: Missing address parameter
- `500`: Server error

---

### POST /api/auth/siwe

Verify signed SIWE message and create session.

**Request Body:**
```json
{
  "address": "0x1234567890123456789012345678901234567890",
  "signature": "0xabc123...",
  "message": "example.com wants you to sign in..."
}
```

**Response:**
```json
{
  "success": true,
  "address": "0x1234567890123456789012345678901234567890"
}
```

Sets HTTP-only cookie: `siwe-session` (valid for 7 days)

**Error Responses:**
- `400`: Missing required fields
- `401`: Invalid signature
  ```json
  {
    "error": "Invalid signature format"
  }
  ```
- `500`: Server error

---

### GET /api/auth/session

Check if user is logged in (has valid session).

**Response (Logged In):**
```json
{
  "isLoggedIn": true,
  "address": "0x1234567890123456789012345678901234567890"
}
```

**Response (Not Logged In):**
```json
{
  "isLoggedIn": false
}
```

**Error Responses:**
- `500`: Server error (returns `isLoggedIn: false`)

---

### DELETE /api/auth/session

Logout (clear session cookie).

**Response:**
```json
{
  "success": true
}
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request - Missing or invalid parameters |
| 401 | Unauthorized - Invalid authentication |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error - Server-side failure |

---

## Rate Limiting

Currently no rate limiting is implemented. Consider implementing rate limiting for production use.

---

## Security Notes

1. **Wallet Address Validation**: All wallet addresses are validated using `ethers.isAddress()` before processing
2. **SQL Injection Protection**: All database queries use parameterized queries via Supabase
3. **Input Sanitization**: All user inputs are validated and sanitized
4. **No Fallback Values**: API fails hard if required environment variables are missing
5. **CSP Headers**: Content Security Policy headers are configured for XSS protection

---

**Last Updated:** November 2024

