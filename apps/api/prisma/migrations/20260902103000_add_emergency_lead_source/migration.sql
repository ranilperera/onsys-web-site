-- Emergency-page enquiries are worth reporting on separately: they are
-- companies running production databases without a support agreement.

-- AlterEnum
ALTER TYPE "LeadSource" ADD VALUE 'EMERGENCY';
