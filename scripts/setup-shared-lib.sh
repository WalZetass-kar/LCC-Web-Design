#!/bin/bash

# Script untuk memindahkan shared code ke shared-lib

echo "📦 Moving shared code to shared-lib..."

# Copy database files
cp -r src/database/* packages/shared-lib/src/database/
echo "✅ Database files copied"

# Copy shared types
cp src/shared/types.ts packages/shared-lib/src/types/
cp src/types/* packages/shared-lib/src/types/ 2>/dev/null || true
echo "✅ Types copied"

# Copy shared utils
cp src/shared/validation.ts packages/shared-lib/src/utils/
cp src/shared/passwordPolicy.ts packages/shared-lib/src/utils/
cp src/shared/endpointSecurity.ts packages/shared-lib/src/utils/
echo "✅ Utils copied"

# Copy shared services
cp src/backend/services/crypto.ts packages/shared-lib/src/services/
cp src/backend/services/validation.ts packages/shared-lib/src/services/
cp src/backend/services/sanitizer.ts packages/shared-lib/src/services/
cp src/backend/services/errorHandler.ts packages/shared-lib/src/services/
echo "✅ Services copied"

# Copy shared config
cp src/shared/config/rbac.ts packages/shared-lib/src/config/
echo "✅ Config copied"

echo "✨ Shared library setup complete!"
