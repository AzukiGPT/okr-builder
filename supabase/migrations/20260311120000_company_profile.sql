-- Add company profile fields to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_website TEXT,
  ADD COLUMN IF NOT EXISTS company_description TEXT;
