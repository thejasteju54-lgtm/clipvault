-- ====================================================================
-- CLIPVAULT: DATABASE MIGRATION 001 - CORE SCHEMA & INDEXES
-- PostgreSQL 15+ compatible with Supabase Auth integration
-- ====================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Registered Devices Table
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('android', 'windows', 'web', 'macos', 'linux')),
    os_version TEXT NOT NULL DEFAULT '',
    app_version TEXT NOT NULL DEFAULT '',
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_device UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_devices_user_id ON public.devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_lookup ON public.devices(user_id, device_id, is_revoked);

-- 3. Clipboard Items Ledger Table
CREATE TABLE IF NOT EXISTS public.clipboard_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    device_sequence BIGINT NOT NULL DEFAULT 1,
    content_type TEXT NOT NULL CHECK (content_type IN ('text', 'url', 'code', 'rich_text', 'image', 'file_ref')),
    original_mime_types TEXT[] NOT NULL DEFAULT '{}',
    plain_text TEXT NOT NULL,
    detected_url TEXT,
    html_content TEXT,
    content_hash TEXT NOT NULL,
    content_size_bytes BIGINT NOT NULL DEFAULT 0,
    attachment_path TEXT,
    attachment_url TEXT,
    source_app TEXT,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    tags TEXT[] NOT NULL DEFAULT '{}',
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    retention_policy TEXT NOT NULL DEFAULT 'permanent' CHECK (retention_policy IN ('permanent', '30_days', 'session_only')),
    tsv tsvector GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(plain_text, '') || ' ' || coalesce(detected_url, ''))
    ) STORED,
    CONSTRAINT uq_user_content_hash UNIQUE (user_id, content_hash)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_clipboard_user_timeline ON public.clipboard_items(user_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_clipboard_user_pinned ON public.clipboard_items(user_id, is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_clipboard_user_favorites ON public.clipboard_items(user_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_clipboard_user_type ON public.clipboard_items(user_id, content_type);
CREATE INDEX IF NOT EXISTS idx_clipboard_tags_gin ON public.clipboard_items USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_clipboard_tsv_gin ON public.clipboard_items USING GIN (tsv);

-- Automatic updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_clipboard_updated_at ON public.clipboard_items;
CREATE TRIGGER trigger_clipboard_updated_at
    BEFORE UPDATE ON public.clipboard_items
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
