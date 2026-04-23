-- SQL MIGRATION: ADD is_blocked COLUMN
-- This migration script adds an is_blocked boolean column to the users table
-- to support the administrative account disabling feature.

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_blocked') THEN
        ALTER TABLE public.users ADD COLUMN is_blocked boolean DEFAULT false NOT NULL;
    END IF;
END $$;
