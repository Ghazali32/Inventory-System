# Frontend API Field Guide

This file is a plain field reference for the frontend team. It removes code samples and explains exactly what to send and what to expect back.

**Base URL:** `/api`

## Authentication and device rules

- Send `Authorization: Bearer <access_token>` on protected endpoints.
- Send `X-Device-Id: <device_id>` on protected endpoints.
- `signup_temp` creates the user, account, and device mapping.
- `signin_temp` works only when `AccountUserAccess.is_active = True`.
- The current signin flow does **not** use OTP or `User.is_verified`.
- Access tokens last 15 minutes.
- Refresh tokens last 7 days and are rotated/blacklisted by SimpleJWT.

## User and account tables

### `accounts_user`

Important fields:

| Field | Type | Notes |
|-------|------|------|
| `user_id` | UUID | Primary key used by JWT |
| `username` | string | Required for login |
| `email` | string or null | Optional, unique if provided |
| `phone_number` | string or null | Optional, unique if provided |
| `is_active` | boolean | Must be `true` for login |
| `is_verified` | boolean | Legacy field, not used by current signin flow |

### `accounts_account`

Important fields returned to FE:

| Field | Type | Notes |
|-------|------|------|
| `account_id` | UUID | Account primary key |
| `account_name` | string | Business name |
| `owner` | UUID | User ID of the owner |
| `initial_device_id` | string | Device used at signup |
| `number_of_devices_registered` | integer | Device count |
| `subscription_plan` | string | Usually `free` |
| `subscription_status` | string | `active` or `paused` |
| `max_devices` | integer | Device limit |
| `created_at` | datetime | Auto-generated |
| `updated_at` | datetime | Auto-updated |
| `is_deleted` | boolean | Soft delete flag |
| `is_verified` | boolean | Legacy account flag, not used for signin |

### `accounts_accountuseraccess`

This table controls whether a user can log in to an account.

| Field | Type | Notes |
|-------|------|------|
| `user` | UUID FK | Links to `accounts_user.user_id` |
| `account` | UUID FK | Links to `accounts_account.account_id` |
| `is_active` | boolean | Must be `true` before signin is allowed |
| `jwt_version` | integer | Used to invalidate old tokens |
| `created_at` | datetime | Auto-generated |
| `updated_at` | datetime | Auto-updated |

## Login rule

The user can sign in only when all of these are true:

1. `accounts_user.is_active = true`
2. A matching `accounts_accountuseraccess` row exists for that user and account
3. `accounts_accountuseraccess.is_active = true`
4. The request sends the correct `device_id`

There is no OTP approval in the current flow.

## Auth endpoints

### `POST /api/auth/signup_temp/`

Creates:
- `accounts_user`
- `accounts_account`
- `accounts_accountuseraccess`
- `accounts_deviceregistration`

Request body fields:

| Field | Required | Type | Notes |
|-------|----------|------|------|
| `username` | Yes | string | Must be unique |
| `email` | No | string or null | Optional, unique if provided |
| `password` | Yes | string | Minimum 8 characters |
| `phone_number` | No | string or null | Optional, unique if provided |
| `account_name` | Yes | string | Business name |
| `device_id` | Yes | string | First device ID |
| `device_name` | No | string | Friendly device label |

Response fields:

| Field | Type | Notes |
|-------|------|------|
| `mode` | string | `demo_temp` |
| `status` | string | `signup_success` |
| `summary.username` | string | Echoed username |
| `summary.account_name` | string | Echoed account name |
| `summary.phone_number` | string or null | Echoed phone number |
| `message` | string | Human-readable message |
| `user.id` | UUID | `accounts_user.user_id` |
| `user.username` | string | Username |
| `user.email` | string or null | Email |
| `customer` | object | `CustomerAccountSerializer` output |
| `device_policy.single_active_device` | boolean | Always `true` |
| `device_policy.active_device_id` | string | The signed-up device ID |

Important signup behavior:

- Empty `email` and `phone_number` are normalized to `null`.
- The signup view currently creates `accounts_accountuseraccess.is_active = false`.
- This means the superuser must activate the access row before signin.

### `POST /api/auth/signin_temp/`

Request body fields:

| Field | Required | Type | Notes |
|-------|----------|------|------|
| `username` | Yes | string | Login username |
| `password` | Yes | string | Login password |
| `device_id` | Yes | string | Must match a registered active device |
| `device_name` | No | string | Optional friendly name |

Response fields:

| Field | Type | Notes |
|-------|------|------|
| `mode` | string | `demo_temp` |
| `user.id` | UUID | `accounts_user.user_id` |
| `user.username` | string | Username |
| `user.email` | string or null | Email |
| `customer` | object | `CustomerAccountSerializer` output |
| `tokens.access` | string | JWT access token |
| `tokens.refresh` | string | JWT refresh token |
| `security.suspicious_location_detected` | boolean | Geo-risk flag |
| `device_policy.single_active_device` | boolean | Always `true` |
| `device_policy.active_device_id` | string | Active device ID |

## Inventory and product models

### `products_productmaster`

This is the shared product catalog.

| Field | Type | Required | Notes |
|-------|------|----------|------|
| `sku` | string | Yes | Unique product code |
| `barcode` | string or null | No | Product barcode |
| `barcode_type` | string | No | `EAN`, `UPC`, `IMEI`, `INTERNAL`, `CUSTOM` |
| `category` | string | Yes | Product category |
| `brand` | string | Yes | Brand name |
| `model` | string | Yes | Model name |
| `color` | string | No | Optional color |
| `specs` | object | No | JSON specs |
| `has_imei` | boolean | No | True for IMEI-tracked products |
| `created_at` | datetime | Read only | Auto-generated |
| `updated_at` | datetime | Read only | Auto-updated |

### `products_productinventory`

Each row represents one physical stock item.

| Field | Type | Required | Notes |
|-------|------|----------|------|
| `id` | integer | Read only | Inventory row ID |
| `account_id` | UUID | Read only | Derived from the account relation |
| `sku` | string | Read only | From product master |
| `category` | string | Read only | From product master |
| `brand` | string | Read only | From product master |
| `model` | string | Read only | From product master |
| `color` | string | Read only | From product master |
| `specs` | object | Read only | From product master |
| `product_barcode` | string or null | Read only | From product master |
| `imei1` | string or null | No | Primary IMEI |
| `imei2` | string or null | No | Secondary IMEI |
| `buying_price` | decimal or null | No | Cost price |
| `msp` | decimal or null | No | Minimum selling price |
| `mrp` | decimal or null | No | Maximum retail price |
| `gst` | decimal or null | No | GST percent |
| `sold` | boolean | Read only | Sale flag |
| `sold_datetime` | datetime or null | Read only | Sale timestamp |
| `inventory_entry_datetime` | datetime | Read only | Entry timestamp |
| `created_at` | datetime | Read only | Auto-generated |
| `updated_at` | datetime | Read only | Auto-updated |

### `products_soldcustomer`

Used for checkout and billing.

| Field | Type | Required | Notes |
|-------|------|----------|------|
| `customer_id` | UUID | Read only | Primary key |
| `account` | UUID | Read only | Business account |
| `name` | string | Yes | Customer name |
| `phone_number` | string | No | Customer phone |
| `email` | string | No | Customer email |
| `address` | string or null | No | Street address |
| `city` | string or null | No | City |
| `state` | string or null | No | State |
| `pincode` | string or null | No | Postal code |
| `created_at` | datetime | Read only | Auto-generated |
| `updated_at` | datetime | Read only | Auto-updated |

## Product creation and scan endpoints

### `POST /api/scans/ingest/`

Request body fields:

| Field | Required | Type | Notes |
|-------|----------|------|------|
| `product_barcode` | Yes | string | Barcode from scan |
| `imei1` | No | string or null | Primary IMEI |
| `imei2` | No | string or null | Secondary IMEI |
| `source` | No | string | Optional source label |

Behavior:

- If the barcode does not match a product master, the API returns `form_required: true` and a `prefill` object.
- If the IMEI already exists for the active account, the API returns `409`.
- If the product exists, a new inventory row is created.

Response when product is not found:

| Field | Type | Notes |
|-------|------|------|
| `action` | string | `not_found` |
| `product_found` | boolean | `false` |
| `message` | string | Explain to open create form |
| `form_required` | boolean | `true` |
| `prefill.product_barcode` | string | Echoed barcode |
| `prefill.imei1` | string | Echoed IMEI or empty string |
| `prefill.imei2` | string | Echoed IMEI or empty string |
| `prefill.quantity` | integer | Always `1` |

Response when inventory is created:

| Field | Type | Notes |
|-------|------|------|
| `action` | string | `created` |
| `product_found` | boolean | `true` |
| `product` | object | `ProductInventorySerializer` output |

### `POST /api/products/create-from-form/`

Use this only for creating a new saved product.

Request body fields:

| Field | Required | Type | Notes |
|-------|----------|------|------|
| `product_barcode` | Yes | string | Product barcode |
| `imei1` | No | string or null | Primary IMEI |
| `imei2` | No | string or null | Secondary IMEI |
| `sku` | Yes | string | Unique SKU |
| `category` | Yes | string | Required by backend view |
| `brand` | Yes | string | Required by backend view |
| `model` | Yes | string | Required by backend view |
| `color` | No | string | Optional |
| `barcode_type` | No | string | Default `INTERNAL` |
| `specs` | No | object | JSON object |
| `buying_price` | No | decimal | Cost price |
| `msp` | No | decimal | Minimum selling price |
| `mrp` | No | decimal | Maximum retail price |
| `gst` | No | decimal | GST percent |

Notes:

- `specs` can be sent as JSON.
- Duplicate IMEIs inside the same account are rejected.
- If `ProductMaster.has_imei` is true, `imei1` is required.

Response:

| Field | Type | Notes |
|-------|------|------|
| `action` | string | `created` |
| `product` | object | `ProductInventorySerializer` output |

### `PUT /api/products/<int:inventory_id>/update-from-form/`

Use this only for editing an existing saved product.

Request body fields:

| Field | Required | Type | Notes |
|-------|----------|------|------|
| `product_barcode` | Yes | string | Product barcode |
| `imei1` | No | string or null | Primary IMEI |
| `imei2` | No | string or null | Secondary IMEI |
| `sku` | Yes | string | Unique SKU |
| `category` | Yes | string | Required by backend view |
| `brand` | Yes | string | Required by backend view |
| `model` | Yes | string | Required by backend view |
| `color` | No | string | Optional |
| `barcode_type` | No | string | Default `INTERNAL` |
| `specs` | No | object | JSON object |
| `buying_price` | No | decimal | Cost price |
| `msp` | No | decimal | Minimum selling price |
| `mrp` | No | decimal | Maximum retail price |
| `gst` | No | decimal | GST percent |

Response:

| Field | Type | Notes |
|-------|------|------|
| `action` | string | `updated` |
| `product` | object | `ProductInventorySerializer` output |

The backend rejects updates for sold products.

### `DELETE /api/products/<int:inventory_id>/delete/`

Deletes a saved inventory row for the active account.

Response fields:

| Field | Type | Notes |
|-------|------|------|
| `detail` | string | Success message |
| `inventory_id` | integer | Deleted inventory row ID |
| `product_master_deleted` | boolean | `true` only when the linked product master was also unused and removed |

Notes:

- The backend deletes the inventory row first.
- The linked product master is deleted only when nothing else references it.
- Sold history is preserved because the product master is not deleted when it is still referenced by sales records.

## Checkout endpoints

### `GET /api/checkout/customers/<uuid>/`

This returns a sold-customer record by `customer_id`.

Response fields:

| Field | Type | Notes |
|-------|------|------|
| `customer_id` | UUID | Sold customer ID |
| `account` | UUID | Business account |
| `name` | string | Customer name |
| `phone_number` | string | Phone number |
| `email` | string | Email |
| `address` | string or null | Address |
| `city` | string or null | City |
| `state` | string or null | State |
| `pincode` | string or null | Postal code |
| `created_at` | datetime | Created time |
| `updated_at` | datetime | Updated time |

### `POST /api/checkout/preview/`

Request body fields:

| Field | Required | Type | Notes |
|-------|----------|------|------|
| `inventory_id` | No | integer | Inventory row ID |
| `product_barcode` | No | string | Alternate inventory lookup |
| `imei1` | No | string | Alternate inventory lookup |
| `imei2` | No | string | Alternate inventory lookup |
| `customer_id` | No | UUID | Sold-customer ID |

At least one of `inventory_id`, `product_barcode`, `imei1`, or `imei2` must be sent.

Response fields:

| Field | Type | Notes |
|-------|------|------|
| `checkout_ready` | boolean | Always `true` when resolved |
| `inventory` | object | `ProductInventorySerializer` output |
| `customer` | object or null | `SoldCustomerSerializer` output if `customer_id` was sent |
| `billing_details` | object | Billing snapshot for invoice screen |
| `next_step` | string | `customer_selection` or `checkout` |

`billing_details` fields:

| Field | Type | Notes |
|-------|------|------|
| `shop_name` | string | Account name |
| `invoice_number` | null | Not generated yet |
| `invoice_date` | string | ISO date |
| `customer_name` | string | Sold customer name |
| `customer_address` | string | Sold customer address |
| `customer_contact` | string | Sold customer phone |
| `customer_gst` | string | Empty for now |
| `state_code` | string | Empty for now |
| `product_name` | string | Product model |
| `brand_name` | string | Brand name |
| `model_number` | string | Model number |
| `imei_no_1` | string | IMEI 1 or empty string |
| `imei_no_2` | string | IMEI 2 or empty string |
| `serial_number` | string | Empty for now |
| `hsn_sac` | string | Empty for now |
| `quantity` | integer | Always `1` |
| `rate` | string | Price used for billing |
| `amount` | string | Same as rate for quantity 1 |
| `cgst_percent` | string | Half of GST percent |
| `cgst_amount` | string | Half of GST amount |
| `sgst_percent` | string | Half of GST percent |
| `sgst_amount` | string | Half of GST amount |
| `total_amount` | string | Final total |
| `payment_mode` | string | Default `cash` |
| `cheque_number` | string | Empty string |

## Admin endpoints

### `POST /api/customers/`

Admin only. Creates an `Account` record.

### `POST /api/customers/<uuid>/subscription/`

Admin only. Request body:

| Field | Required | Allowed values |
|-------|----------|----------------|
| `action` | Yes | `pause`, `resume` |

## Simple FE flow

1. Sign up with `signup_temp`.
2. Superuser sets `accounts_accountuseraccess.is_active = true` for the user-account pair.
3. Sign in with `signin_temp`.
4. Save `access`, `refresh`, `device_id`, and `customer.account_id` on the frontend.
5. Scan product with `scans/ingest`.
6. If the product is not found, open the form and send `create-from-form`.
7. Select or fetch the sold customer with `checkout/customers/<uuid>/`.
8. Call `checkout/preview/` to render billing.

## Notes for FE devs

- Do not send OTP fields; they are not part of the current login flow.
- Treat `AccountUserAccess.is_active` as the actual login approval switch.
- Use `null` for missing `email`, `phone_number`, `imei1`, and `imei2` instead of empty strings when possible.
- Reuse the same `device_id` on the same browser/device profile.
- If a protected request returns `401`, refresh the token and retry.