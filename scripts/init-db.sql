-- Neon PostgreSQL Database Schema
-- Run this script to initialize the database tables

-- Payment contexts table
CREATE TABLE IF NOT EXISTS payment_contexts (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMP NOT NULL,
  paid_at TIMESTAMP
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  email VARCHAR(255) PRIMARY KEY,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at TIMESTAMP
);

-- User progress table
CREATE TABLE IF NOT EXISTS user_progress (
  email VARCHAR(255) PRIMARY KEY,
  progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_active_at TIMESTAMP NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_contexts_email ON payment_contexts(email);
CREATE INDEX IF NOT EXISTS idx_payment_contexts_status ON payment_contexts(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_is_paid ON subscriptions(is_paid);

