-- Add voted_entries column to teacher_vote_tokens to store per-token vote entries
ALTER TABLE teacher_vote_tokens ADD COLUMN IF NOT EXISTS voted_entries TEXT NULL;