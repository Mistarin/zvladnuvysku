ALTER TABLE subject_proposals
  ADD COLUMN IF NOT EXISTS submission_token text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subject_proposals_submission_token
  ON subject_proposals (submission_token)
  WHERE submission_token IS NOT NULL;
