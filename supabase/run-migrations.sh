#!/bin/bash
# Jalankan semua migrations ke Supabase secara berurutan
# Usage: bash supabase/run-migrations.sh

set -e

PROJECT_REF="anegfcpfxhhpvaaiiusa"

echo "🔗 Linking ke Supabase project..."
npx supabase link --project-ref $PROJECT_REF

echo "🚀 Menjalankan migrations..."
npx supabase db push

echo "✅ Migrations selesai!"
echo ""
echo "📝 Generate TypeScript types..."
npx supabase gen types typescript --project-id $PROJECT_REF > types/supabase.ts
echo "✅ Types di-generate ke types/supabase.ts"
