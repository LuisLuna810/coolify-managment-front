# Backend Token Validation Requirements

## Problem
Currently the frontend needs to validate if the JWT token is still valid, but there might not be a proper `/auth/me` endpoint or it's not working correctly.

## Solution Options

### Option 1: Implement `/auth/me` endpoint (Recommended)
Create a simple endpoint that returns the current user data if the token is valid.

**Endpoint:** `GET /auth/me`
**Headers:** `Cookie: token=<jwt_token>`
**Response (200):**
```json
{
  "id": "user123",
  "email": "user@example.com", 
  "username": "username",
  "role": "admin" | "developer"
}
```
**Response (401):**
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### Option 2: Implement `/auth/validate` endpoint
A simple validation endpoint that only checks if token is valid.

**Endpoint:** `GET /auth/validate`
**Headers:** `Cookie: token=<jwt_token>`
**Response (200):**
```json
{
  "valid": true,
  "user": {
    "id": "user123",
    "role": "admin"
  }
}
```
**Response (401):**
```json
{
  "valid": false,
  "error": "Invalid or expired token"
}
```

### Option 3: Use existing endpoints
If implementing new endpoints is not possible, we can use existing authenticated endpoints like:
- `GET /projects/my` (for developers)
- `GET /users` (for admins, will return 403 for developers but 401 for invalid tokens)

## Backend Implementation Example (Node.js/Express)

```javascript
// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// /auth/me endpoint
app.get('/auth/me', verifyToken, (req, res) => {
  // req.user contains the decoded JWT payload
  res.json({
    id: req.user.id,
    email: req.user.email,
    username: req.user.username,
    role: req.user.role
  });
});

// OR /auth/validate endpoint
app.get('/auth/validate', verifyToken, (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      role: req.user.role
    }
  });
});
```

## Current Frontend Fallback Strategy
The frontend now tries multiple approaches:
1. Try `/auth/me` first
2. If that fails, try `/projects/my` 
3. If that fails, try `/users` (checks if 403 vs 401)
4. Only logout on 401 errors (invalid token)
5. Ignore other errors (network, server errors)

This should work even without backend changes, but implementing `/auth/me` would be the cleanest solution.