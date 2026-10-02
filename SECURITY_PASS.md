# Security pass applied to original project

This pass adds mandatory authentication without changing the MongoDB data.

## Environment variables
- `AUTH_SECRET`: random secret, at least 32 characters
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `STAFF_USERS_JSON`: optional JSON array of `{ "username": "...", "password": "..." }`

## Behavior
- All application pages require login.
- All API routes require a valid session cookie.
- Health and login endpoints remain public.
- DELETE through the generic data API requires ADMIN role.
- Existing MongoDB collections/data are not deleted or migrated by this pass.

## Important
Use strong credentials and HTTPS in production. For a larger multi-user deployment, replace the env-based credentials with a proper identity provider (for example Clerk) and per-user authorization.
