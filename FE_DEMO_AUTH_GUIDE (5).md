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

**Note:** There is no public forgot-password endpoint in the current flow. If a user forgets the password, the admin can reset it from the admin panel using the endpoint below.

### `GET` /api/accounts/profile/
### `POST` /api/accounts/profile/
### `PUT` /api/accounts/profile/

**Purpose:**
- After signin, the FE must prompt the user to fill their business profile (UserProfile).
- This endpoint allows the user to create, update, or fetch their business profile.
- The profile must be completed before proceeding to inventory or selling flows.

**Headers:**
- `Authorization: Bearer <access_token>` (required)
- `X-Device-Id: <device_id>` (required)

**Request fields (POST/PUT):**
| Field | Type | Required | Notes |
|-------|------|----------|------|
| `shop_name` | string | Yes | Business/shop name |
| `owner_name` | string | Yes | Owner name |
| `shop_address` | string | Yes | Address |
| `shop_city` | string | Yes | City |
| `shop_state` | string | Yes | State |
| `shop_pincode` | string | Yes | Pincode |
| `shop_phone` | string | Yes | Business phone |
| `gst_registration_number` | string | No | GST number |
| `pan_number` | string | No | PAN number |
| `shop_license_number` | string | No | Shop license |
| `shop_license_expiry` | string (date) | No | License expiry |
| `bank_account_number` | string | No | Bank account |
| `bank_ifsc_code` | string | No | IFSC code |
| `bank_holder_name` | string | No | Account holder name |
| `aadhar_number` | string | No | Aadhar number |
| `signature_image_base64` | string | No | Retailer signature in base64 Data URI format (`data:image/png;base64,...`) |

**Response fields:**
| Field | Type | Notes |
|-------|------|------|
| All above fields | | |
| `has_signature` | boolean | `true` if signature image is uploaded |
| `created_at` | datetime | Profile created |
| `updated_at` | datetime | Profile updated |

**FE instructions:**
- After signin, always call `GET /api/accounts/profile/`.
- If profile is incomplete, show the form and submit via `POST` or `PUT`.
- Block inventory/selling flow until profile is complete.

### Dedicated Signature Endpoints

### `GET /api/accounts/signature/`
### `POST /api/accounts/signature/`
### `DELETE /api/accounts/signature/`

**Purpose:**
- Dedicated endpoint to fetch, upload/update, or delete the retailer's signature.
- `GET`: Returns `{ "has_signature": boolean, "signature_image_base64": string }`.
- `POST`: Uploads or updates signature `{ "signature_image_base64": "data:image/png;base64,..." }` (Max 5MB).
- `DELETE`: Removes the signature from the account.

**Headers:**
- `Authorization: Bearer <access_token>` (required)
- `X-Device-Id: <device_id>` (required)

### `POST /api/accounts/users/<uuid:user_id>/reset-password/`

**Purpose:**
- Admin-only endpoint to reset a user's password when the user contacts support.
- The reset invalidates active JWT access versions for that user.

**Headers:**
- `Authorization: Bearer <admin_access_token>` (required)

**Request fields:**
| Field | Type | Required | Notes |
|-------|------|----------|------|
| `new_password` | string | Yes | Minimum 8 characters |

**Response fields:**
| Field | Type | Notes |
|-------|------|------|
| `detail` | string | Success message |
| `user_id` | UUID | Reset user's id |
| `username` | string | Reset user's username |

**FE/admin instructions:**
- Use this endpoint only from the admin side, not from the public login screen.
- After reset, share the new password with the user through your support process.

## Inventory and product models

### GST rule table

The backend now stores category-based GST rules in `products_productgstrule`.

| Field | Type | Notes |
|-------|------|------|
| `product_category` | string | Category name used for GST lookup |
| `gst` | decimal | GST percent, e.g. `18.00` |
| `start_date` | date | Rule start date |
| `end_date` | date or null | Rule end date, `null` means active |

Important:

- Electronics currently use `18% GST`.
- Frontend should not calculate GST manually for product display.
- Use the inventory response fields `mop_including_gst`, `mop_excluding_gst`, `gst_label`, and `price_breakdown`.

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
| `gst` | decimal or null | No | GST percent fallback; backend resolves display GST from category rule table |
| `mop_including_gst` | decimal/string | Read only | Full MOP shown to FE |
| `mop_excluding_gst` | decimal/string | Read only | Base amount before GST |
| `gst_label` | string | Read only | Example: `including 18% GST` |
| `price_breakdown` | object | Read only | Contains base amount, GST amount, CGST, and SGST |
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
| `gst` | No | decimal | Optional fallback GST percent; category rule table is used for display and billing |

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
| `gst` | No | decimal | Optional fallback GST percent; category rule table is used for display and billing |

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

## Dashboard endpoint

### `GET /api/dashboard/summary/`

Returns a single account-scoped dashboard payload for the authenticated user.

Query params:

| Param | Required | Type | Notes |
|-------|----------|------|------|
| `period` | No | string | `7d`, `30d`, or `90d` (default `7d`) |

Response fields:

| Field | Type | Notes |
|-------|------|------|
| `inventory` | object | Inventory snapshot |
| `sales` | object | Revenue and count metrics |
| `sales_chart` | array | Daily revenue/count points for the selected period |
| `top_selling` | array | Top 5 products by sales in the period |
| `low_stock` | array | Up to 5 low-stock products |
| `recent_activity` | array | Latest sale and restock activity |

Important:

- `sales_chart` always includes every day in the requested range.
- `recent_activity` restock rows are derived from `ProductInventory.inventory_entry_datetime` because the backend does not yet keep a separate restock audit table.
- The endpoint is protected by `Authorization` and `X-Device-Id` like the rest of the business APIs.

### `GET /api/checkout/history/`

Returns sold-items history for the currently authenticated account (retailer).

Query params:

| Param | Required | Type | Notes |
|-------|----------|------|------|
| `limit` | No | integer | Default `50`, min `1`, max `200` |
| `customer_id` | No | UUID | Filter history for one sold customer |

Response fields:

| Field | Type | Notes |
|-------|------|------|
| `count` | integer | Number of rows in this response |
| `limit` | integer | Effective limit used by API |
| `results` | array | List of sold items (latest first) |

`results[]` item fields:

| Field | Type | Notes |
|-------|------|------|
| `id` | integer | Sold item row ID |
| `invoice_number` | string or null | Invoice number |
| `invoice_date` | date or null | Invoice date |
| `payment_mode` | string | `cash`, `card`, `upi`, `cheque`, `emi` |
| `total_amount` | decimal or null | Final billed amount |
| `selling_datetime` | datetime | Sale timestamp |
| `quantity` | integer | Usually `1` |
| `customer_id` | UUID or null | Linked sold-customer ID |
| `customer_name` | string or null | Linked sold-customer name |
| `customer_contact` | string or null | Contact used in invoice snapshot |
| `product_sku` | string | Product SKU |
| `product_barcode` | string or null | Product barcode |
| `product_brand` | string | Product brand |
| `product_model` | string | Product model |
| `imei_no_1` | string or null | IMEI 1 at sale time |
| `imei_no_2` | string or null | IMEI 2 at sale time |
| `buying_price` | decimal or null | Buying price from inventory row |
| `msp` | decimal or null | MSP from inventory row |
| `mrp` | decimal or null | MRP from inventory row |
| `inventory_id` | integer or null | Source inventory row that was sold |
| `created_at` | datetime | Record creation time |

Important:

- History is always account-scoped using JWT + `X-Device-Id`.
- This endpoint is read-only and does not mutate inventory or sale records.

### `GET /api/checkout/customers/`

Customer list endpoint for FE dropdown search while selling.

Query params:

| Param | Required | Type | Notes |
|-------|----------|------|------|
| `search` | No | string | Search by `name`, `phone_number`, or `email` |
| `limit` | No | integer | Default `100`, min `1`, max `200` |

Response fields:

| Field | Type | Notes |
|-------|------|------|
| `count` | integer | Number of rows in this response |
| `limit` | integer | Effective limit used by API |
| `results` | array | Customer list for dropdown/search |

`results[]` item fields:

| Field | Type | Notes |
|-------|------|------|
| `customer_id` | UUID | Sold-customer ID |
| `name` | string | Customer name |
| `phone_number` | string | Customer phone |
| `email` | string | Customer email |
| `city` | string or null | City |
| `state` | string or null | State |
| `purchase_count` | integer | Number of products purchased |
| `total_spent` | decimal | Total billed amount across purchases |
| `last_purchase_at` | datetime or null | Latest sale timestamp |

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

### `GET /api/checkout/customers/<uuid>/history/`

Returns one customer's complete purchase history.

Query params:

| Param | Required | Type | Notes |
|-------|----------|------|------|
| `limit` | No | integer | Default `100`, min `1`, max `500` |

Response fields:

| Field | Type | Notes |
|-------|------|------|
| `customer` | object | `SoldCustomerSerializer` output |
| `count` | integer | Number of rows in this response |
| `limit` | integer | Effective limit used by API |
| `results` | array | Sold items for that customer |

### `DELETE /api/checkout/customers/<uuid>/history/`

Deletes that customer's sale history entries (and customer record) for the current account.

Response fields:

| Field | Type | Notes |
|-------|------|------|
| `detail` | string | Success message |
| `customer_id` | UUID | Deleted customer id |
| `deleted_records` | integer | Number of deleted DB records |

### `GET /api/checkout/invoices/<invoice_number>/`

Fetch a full invoice payload for one sale.

Response fields include:

- invoice metadata (`invoice_number`, `invoice_date`, `payment_mode`, `selling_datetime`)
- customer snapshot (`customer_name`, `customer_address`, `customer_contact`, `customer_gst`)
- product snapshot (`product_name`, `brand_name`, `model_number`, `imei_no_1`, `imei_no_2`)
- tax/amount fields (`rate`, `amount`, `cgst_*`, `sgst_*`, `total_amount`)
- inventory price fields (`buying_price`, `msp`, `mrp`)

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
| `base_amount` | string | Price before GST split |
| `gst_percent` | string | Total GST percent from category rule table |
| `gst_amount` | string | Total GST amount included in rate |
| `cgst_percent` | string | Half of GST percent |
| `cgst_amount` | string | Half of GST amount |
| `sgst_percent` | string | Half of GST percent |
| `sgst_amount` | string | Half of GST amount |
| `total_amount` | string | Final total |
| `payment_mode` | string | Default `cash` |
| `cheque_number` | string | Empty string |

Important:

- `checkout/preview` is read-only. It does not create sale records.
- To complete a sale (and move item out of active inventory), call `POST /api/checkout/complete/`.
- For product display and checkout, treat MOP as GST-inclusive and use `mop_including_gst`, `mop_excluding_gst`, `gst_label`, and `price_breakdown` from the inventory serializer.
- For electronics, the current GST rule is 18% and the split should be shown as CGST + SGST.

### `POST /api/checkout/complete/`

This endpoint finalizes the sale in one transaction:

- Creates `SoldItem`
- Creates `SoldCustomer` when `customer_id` is not provided
- Marks `ProductInventory.sold = true` and sets `sold_datetime`

Request body fields:

| Field | Required | Type | Notes |
|-------|----------|------|------|
| `inventory_id` | No | integer | Preferred way to identify item |
| `product_barcode` | No | string | Alternate lookup |
| `imei1` | No | string | Alternate lookup |
| `imei2` | No | string | Alternate lookup |
| `customer_id` | No | UUID | Existing sold customer |
| `customer_name` | No* | string | Required when `customer_id` is not sent |
| `customer_phone` | No | string | For new sold customer |
| `customer_email` | No | string | For new sold customer |
| `customer_address` | No | string | For new sold customer |
| `customer_city` | No | string | For new sold customer |
| `customer_state` | No | string | For new sold customer |
| `customer_pincode` | No | string | For new sold customer |
| `payment_mode` | No | string | `cash`, `card`, `upi`, `cheque`, `emi` |

At least one of `inventory_id`, `product_barcode`, `imei1`, `imei2` is required.

Response fields:

| Field | Type | Notes |
|-------|------|------|
| `sale_completed` | boolean | `true` on success |
| `invoice_number` | string | Generated invoice id |
| `sold_item_id` | integer | New sold item row id |
| `inventory_id` | integer | Sold inventory row id |
| `customer` | object | `SoldCustomerSerializer` output |
| `message` | string | Success message |

### `POST /api/products/scan-for-selling/`

**Purpose:**
- Use this endpoint in the selling flow when scanning a product to check if it is available for sale (not just for inventory add).
- This avoids ambiguity for IMEI-less products and ensures only unsold inventory is fetched for selling.

**Headers:**
- `Authorization: Bearer <access_token>` (required)
- `X-Device-Id: <device_id>` (required)

**Request fields:**
| Field | Required | Type | Notes |
|-------|----------|------|------|
| `product_barcode` | Yes | string | Product barcode to scan |
| `imei1` | No | string or null | Primary IMEI (if applicable) |
| `imei2` | No | string or null | Secondary IMEI (if applicable) |

**Response (if found):**
| Field | Type | Notes |
|-------|------|------|
| `action` | string | `found` |
| `product_found` | boolean | `true` |
| `product` | object | `ProductInventorySerializer` output |

**Response (if not found):**
| Field | Type | Notes |
|-------|------|------|
| `action` | string | `not_found` |
| `product_found` | boolean | `false` |
| `message` | string | Not found message |

**FE instructions:**
- Jab selling flow me scan ho, toh yahi endpoint hit karo.
- Agar product mil gaya toh selling flow continue karo, nahi mila toh error ya add flow dikhao.

## AI Extraction (Voice/Auto Form Fill)

- The backend uses OpenAI with a strict master prompt for extracting product fields from voice/text.
- Color is always extracted at the top level (never inside specs), normalized to English title-case (e.g. "Blue", "Black").
- For accessories, `model` is always the accessory type (e.g. "Cable", "Earphone", "Charger", etc.), never empty, and never a product number.
- Specs only contains extra attributes (e.g. connector_type, length, wattage, ram, rom, etc.), never color/brand/model/price.
- Connector types are normalized (e.g. "C2B", "type c to b", etc. → "Type C to B").
- No raw transcript is ever returned in specs or any field.
- All missing fields are listed in `missing_fields`.
- See backend prompt for full rules and examples.

### Example (Accessory):
Input: "MI charger cable blue colour Type C to B"
Output:
{
  "category": "accessories",
  "brand": "MI",
  "model": "Cable",
  "color": "Blue",
  "specs": { "connector_type": "Type C to B" },
  ...
}

### Example (Mobile):
Input: "Samsung Galaxy S24 black 8GB 256GB buying price 55000 mrp 79999"
Output:
{
  "category": "mobile",
  "brand": "Samsung",
  "model": "Galaxy S24",
  "color": "Black",
  "specs": { "ram": "8GB", "rom": "256GB" },
  ...
}

---

## New Features (v2)

### `GET /api/checkout/history/export/`

**Purpose:**
- Download sales history as an Excel (.xlsx) file for offline reporting.
- Filtered by time range: last N months or previous calendar month.

**Headers:**
- `Authorization: Bearer <access_token>` (required)
- `X-Device-Id: <device_id>` (required)

**Query params:**

| Param | Required | Type | Notes |
|-------|----------|------|-------|
| `months` | No | integer | `1`, `2`, `3`, `6`, `12` — how many months back from today. Default `1` |
| `period` | No | string | `last_month` — shortcut for the previous calendar month. Overrides `months` if set |

**Response:**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="sales_history_YYYY-MM-DD_to_YYYY-MM-DD.xlsx"`
- The Excel file contains columns: #, Invoice No, Invoice Date, Customer Name, Customer Contact, Product Name, Brand, Model, IMEI 1, IMEI 2, HSN/SAC, Quantity, Rate (₹), Amount (₹), CGST %, CGST (₹), SGST %, SGST (₹), Total Amount (₹), Payment Mode
- Includes a TOTAL summary row at the bottom.

**FE instructions:**
- Add a "Download Excel" button on the sales history page.
- Show a dropdown: Last 1 month, Last 2 months, Last 3 months, Last 6 months, Last 1 year, Last month (calendar).
- Hit the endpoint and trigger browser file download using `window.open()` or `fetch` + blob download.

---

### Bulk Quantity Add (updated `POST /api/products/create-from-form/`)

**What changed:**
- `create-from-form` now accepts an optional `quantity` field.
- When `quantity > 1`, the backend creates N `ProductInventory` rows (all sharing the same `ProductMaster`, same pricing, no IMEI).
- This is for **local products** without barcodes that a retailer adds manually in bulk.

**New request field:**

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `quantity` | No | integer | Default `1`. Range: `1` to `999`. Cannot be > 1 if `imei1` is set |

**Updated response fields:**

| Field | Type | Notes |
|-------|------|-------|
| `action` | string | `created` |
| `quantity_created` | integer | Number of inventory rows created |
| `product` | object | `ProductInventorySerializer` output (first item) |
| `all_inventory_ids` | array of integers | IDs of all created inventory rows |

**Validation:**
- `quantity > 1` and `imei1` is set → error (can't have duplicate IMEIs)
- `quantity` must be 1–999

**FE instructions:**
- In the "Add Product" form, add a `Quantity` number input field (default 1).
- When adding local products (no barcode/IMEI), allow setting quantity to 10, 20, etc.
- Send `quantity` in the POST body along with other product fields.

---

### `POST /api/checkout/complete-multi/`

**Purpose:**
- Sell multiple products to a single customer in one invoice.
- Each item can have a different quantity.
- Creates one invoice with multiple line items (like the Vyapar invoice screenshot).

**Headers:**
- `Authorization: Bearer <access_token>` (required)
- `X-Device-Id: <device_id>` (required)

**Request body:**

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `customer_id` | No | UUID | Existing sold customer. Required if `customer_name` not sent |
| `customer_name` | No* | string | Required when `customer_id` is not sent |
| `customer_phone` | No | string | For new sold customer |
| `customer_email` | No | string | For new sold customer |
| `customer_address` | No | string | For new sold customer |
| `customer_city` | No | string | For new sold customer |
| `customer_state` | No | string | For new sold customer |
| `customer_pincode` | No | string | For new sold customer |
| `payment_mode` | No | string | `cash`, `card`, `upi`, `cheque`, `emi`. Default `cash` |
| `items` | Yes | array | List of items to sell |

`items[]` fields:

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `inventory_id` | Yes | integer | Reference inventory item (used to identify the product) |
| `quantity` | No | integer | Default `1`. How many units to sell. Range: 1–999 |

**Behavior:**
- All items get the **same invoice number** (one invoice).
- For each item, the backend finds N unsold inventory rows of the same product and marks them sold.
- If not enough stock, returns `400` with detail.
- One `SoldItem` row per line item (with quantity).

**Response fields:**

| Field | Type | Notes |
|-------|------|-------|
| `sale_completed` | boolean | `true` |
| `invoice_number` | string | Single invoice number for the whole sale |
| `invoice_date` | string | ISO date |
| `customer` | object | `SoldCustomerSerializer` output |
| `items` | array | Per-item breakdown |
| `total_quantity` | integer | Sum of all item quantities |
| `grand_total` | string | Sum of all item totals |
| `payment_mode` | string | Payment mode used |
| `sold_inventory_ids` | array of integers | All sold inventory row IDs |
| `message` | string | Success message |

`items[]` response fields:

| Field | Type | Notes |
|-------|------|-------|
| `sold_item_id` | integer | SoldItem row ID |
| `product_name` | string | Product model |
| `brand_name` | string | Brand |
| `model_number` | string | Model |
| `quantity` | integer | Units sold |
| `rate` | string | Unit price |
| `amount` | string | Line total (rate × quantity) |
| `cgst_percent` | string | CGST % |
| `cgst_amount` | string | CGST amount for this line |
| `sgst_percent` | string | SGST % |
| `sgst_amount` | string | SGST amount for this line |
| `total_amount` | string | Line total |
| `imei_no_1` | string | IMEI 1 (if applicable) |
| `imei_no_2` | string | IMEI 2 (if applicable) |

**FE instructions:**
- In billing/checkout, allow adding multiple products (cart-style).
- For each product, allow setting quantity.
- Display as shown in the Vyapar invoice: one row per product with quantity and amount.
- Show sub-total, total, and "Invoice Amount In Words".
- The old `checkout/complete/` endpoint still works for single-item sales.

---

### `GET /api/accounts/signature/`

**Purpose:**
- Retrieve the retailer's uploaded signature image.

**Headers:**
- `Authorization: Bearer <access_token>` (required)

**Response fields:**

| Field | Type | Notes |
|-------|------|-------|
| `has_signature` | boolean | Whether a signature has been uploaded |
| `signature_image_base64` | string | Base64-encoded signature image (empty string if none) |

### `POST /api/accounts/signature/`

**Purpose:**
- Upload or update the retailer's signature image.

**Headers:**
- `Authorization: Bearer <access_token>` (required)

**Request body:**

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `signature_image_base64` | Yes | string | Base64-encoded image data. Can be a data URI like `data:image/png;base64,...` or raw base64. Max 5MB |

**Response fields:**

| Field | Type | Notes |
|-------|------|-------|
| `detail` | string | Success message |
| `has_signature` | boolean | `true` |

### `DELETE /api/accounts/signature/`

**Purpose:**
- Remove the retailer's signature image.

**Response fields:**

| Field | Type | Notes |
|-------|------|-------|
| `detail` | string | Success message |
| `has_signature` | boolean | `false` |

**FE instructions:**
- Add a "Upload Signature" option in settings/profile.
- User can upload a signature image (or draw one using a canvas).
- Convert the image to base64 and send via POST.
- The signature is rendered at the bottom of generated bills (like the "Authorized Signatory" section in the Vyapar invoice screenshot).
- Use: `<img src="data:image/png;base64,..." />` to render it.

### Signature in invoice detail

The `GET /api/checkout/invoices/<invoice_number>/` response now includes:

| Field | Type | Notes |
|-------|------|-------|
| `signature_image_base64` | string | Retailer's signature from their account. Empty string if not uploaded |

**FE instructions:**
- When rendering an invoice/bill, check if `signature_image_base64` is non-empty.
- If present, render it in the "Authorized Signatory" section of the bill.

---