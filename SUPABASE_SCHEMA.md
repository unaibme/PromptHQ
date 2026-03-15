-- Supabase Database Schema for Prompt Manager
-- Run this in your Supabase SQL Editor

-- Create prompts table
CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT DEFAULT '',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Create policy for users to access only their own prompts
-- Note: This assumes you have auth enabled and want to filter by user_id
-- If you want public prompts, you can modify this policy

-- Create a policy for inserting prompts
CREATE POLICY "Users can insert their own prompts" ON prompts
  FOR INSERT WITH CHECK (true);

-- Create a policy for selecting prompts
CREATE POLICY "Users can view all prompts" ON prompts
  FOR SELECT USING (true);

-- Create a policy for updating prompts
CREATE POLICY "Users can update their own prompts" ON prompts
  FOR UPDATE USING (true);

-- Create a policy for deleting prompts
CREATE POLICY "Users can delete their own prompts" ON prompts
  FOR DELETE USING (true);

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_prompts_name ON prompts(name);
CREATE INDEX IF NOT EXISTS idx_prompts_title ON prompts(title);
CREATE INDEX IF NOT EXISTS idx_prompts_keywords ON prompts USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON prompts(created_at DESC);

-- Optional: Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_prompts_updated_at BEFORE UPDATE ON prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
