# ActiveCity API — Auth Endpoints Reference

Base URL: `http://localhost:8080` (development)

All endpoints in this document are under the `/pub` prefix and require **no authentication**.

---

## Response Envelopes

### Success

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { }
}
```

`data` is `null` for endpoints that return no payload (register, verify-otp, forgot-password, reset-password).

### Error

```json
{
  "success": false,
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Human-readable error message"
}
```

The HTTP status code of the response always matches the `status` field in the body.

---

## Error Code Reference

| Code | Meaning |
|---|---|
| `VALIDATION_ERROR` | A required field is blank, too short, or does not match an expected pattern |
| `EMAIL_EXISTS` | An account with the given email already exists |
| `ALREADY_ACTIVE` | The account is already verified and active |
| `USER_NOT_FOUND` | No account found for the given email |
| `INVALID_OTP` | The OTP code was not found or does not match |
| `OTP_EXPIRED` | The OTP code exists but the 15-minute window has passed |
| `INVALID_CREDENTIALS` | Email not found or password does not match |
| `ACCOUNT_NOT_ACTIVE` | Login attempted on an unverified account |
| `MAIL_ERROR` | SMTP send failure |
| `INTERNAL_ERROR` | Unhandled server-side exception |

---

## Endpoints

---

### 1. Register

**`POST /pub/register`**

Registers a new inactive user and sends a 6-digit OTP to the provided email address. The account remains inactive until the OTP is verified via `/pub/verify-otp`.

**Auth required:** No

#### Request Body

| Field | Type | Required | Validation |
|---|---|---|---|
| `email` | string | Yes | Must be a valid email address |
| `password` | string | Yes | Minimum 8 characters |
| `confirmPassword` | string | Yes | Must match `password` |
| `fullName` | string | Yes | Must not be blank |

#### Request Example

```json
{
  "email": "jane.doe@activecity.gov",
  "password": "S3cur3Pass!",
  "confirmPassword": "S3cur3Pass!",
  "fullName": "Jane Doe"
}
```

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "A verification code has been sent to your email.",
  "data": null
}
```

#### Error Responses

| Status | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | A field is blank, the email is invalid, the password is under 8 characters, or `confirmPassword` does not match |
| 409 | `EMAIL_EXISTS` | An account with this email already exists |
| 500 | `MAIL_ERROR` | The OTP email could not be sent |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

### 2. Verify OTP

**`POST /pub/verify-otp`**

Verifies the 6-digit registration OTP and activates the user account. The OTP is valid for 15 minutes. The verification row is hard-deleted after a successful call.

**Auth required:** No

#### Request Body

| Field | Type | Required | Validation |
|---|---|---|---|
| `email` | string | Yes | Must be a valid email address |
| `otpCode` | string | Yes | Must not be blank |

#### Request Example

```json
{
  "email": "jane.doe@activecity.gov",
  "otpCode": "483921"
}
```

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Account verified successfully. You can now log in.",
  "data": null
}
```

#### Error Responses

| Status | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | A field is blank or the email is invalid |
| 400 | `INVALID_OTP` | No matching REGISTRATION OTP record found, or the code does not match |
| 400 | `OTP_EXPIRED` | The OTP exists but expired more than 15 minutes ago |
| 404 | `USER_NOT_FOUND` | No account found with the provided email |
| 409 | `ALREADY_ACTIVE` | The account is already verified |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

### 3. Login

**`POST /pub/login`**

Authenticates a user and returns a signed JWT on success. The account must be active (verified). The JWT carries claims: `sub` (email), `userId`, `role`, `iat`, `exp`. Default expiry is 8 hours (configurable via `JWT_EXPIRY_HOURS`).

**Auth required:** No

#### Request Body

| Field | Type | Required | Validation |
|---|---|---|---|
| `email` | string | Yes | Must be a valid email address |
| `password` | string | Yes | Must not be blank |

#### Request Example

```json
{
  "email": "jane.doe@activecity.gov",
  "password": "S3cur3Pass!"
}
```

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "role": "STAFF",
    "fullName": "Jane Doe",
    "email": "jane.doe@activecity.gov"
  }
}
```

#### `data` Object Fields

| Field | Type | Description |
|---|---|---|
| `token` | string | Signed JWT (HMAC256). Include as `Authorization: Bearer <token>` on protected requests. |
| `role` | string | User role — `STAFF` or `ADMIN` |
| `fullName` | string | User's full name |
| `email` | string | User's email address |

#### Error Responses

| Status | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | A field is blank or the email is invalid |
| 401 | `INVALID_CREDENTIALS` | Email not found or password does not match (same code for both to prevent email enumeration) |
| 403 | `ACCOUNT_NOT_ACTIVE` | Account exists but has not been OTP-verified yet |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

### 4. Forgot Password

**`POST /pub/forgot-password`**

Sends a 6-digit password-reset OTP to the user's email. If the email is not registered, the response is still a success (prevents user enumeration). Any existing PASSWORD_RESET verification record for the user is replaced.

**Auth required:** No

#### Request Body

| Field | Type | Required | Validation |
|---|---|---|---|
| `email` | string | Yes | Must be a valid email address |

#### Request Example

```json
{
  "email": "jane.doe@activecity.gov"
}
```

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "A verification code has been sent to your email.",
  "data": null
}
```

> This response is returned whether or not the email exists in the database.

#### Error Responses

| Status | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | The email field is blank or invalid |
| 500 | `MAIL_ERROR` | The OTP email could not be sent (only when the email is registered) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

### 5. Reset Password

**`POST /pub/reset-password`**

Resets the user's password after verifying the PASSWORD_RESET OTP. The OTP is valid for 15 minutes. The verification row is hard-deleted after a successful call.

**Auth required:** No

#### Request Body

| Field | Type | Required | Validation |
|---|---|---|---|
| `email` | string | Yes | Must be a valid email address |
| `otpCode` | string | Yes | Must not be blank |
| `newPassword` | string | Yes | Minimum 8 characters |
| `confirmPassword` | string | Yes | Must match `newPassword` |

#### Request Example

```json
{
  "email": "jane.doe@activecity.gov",
  "otpCode": "719034",
  "newPassword": "NewS3cur3Pass!",
  "confirmPassword": "NewS3cur3Pass!"
}
```

#### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Your password has been reset successfully.",
  "data": null
}
```

#### Error Responses

| Status | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | A field is blank, email is invalid, `newPassword` is under 8 characters, or `confirmPassword` does not match |
| 400 | `INVALID_OTP` | No matching PASSWORD_RESET OTP record found, or the code does not match |
| 400 | `OTP_EXPIRED` | The OTP exists but expired more than 15 minutes ago |
| 404 | `USER_NOT_FOUND` | No account found with the provided email |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
