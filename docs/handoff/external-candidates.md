# External Candidates in Screeno V2

Updated: 2026-06-12

External candidates are company-owned hiring records that do not require an organization `users` account.

## Data Ownership

`external_candidates` stores:

- Company ownership
- Name and email
- Optional resume URL and update time
- Tags
- Created timestamp

Internal employee resume and tag fields belong to `users`. This distinction avoids creating login accounts for every outside applicant while still allowing both candidate types to use the same interview workflow.

## Scheduling

Managers can schedule AI voice interviews or AI exams for an external candidate. The interview stores either an internal `candidate_id` or an `external_candidate_id`, never both. Candidate identity resolution is centralized in `backend/src/services/candidate-identity.service.js`.

## Security

All external-candidate reads and writes are scoped by the authenticated manager's company. Interview/report access also verifies manager ownership before returning candidate information or delivery history.

## Tests

`backend/test/api-regression.js` verifies:

- External candidate creation with resume URL
- Scheduling an external candidate
- Calendar and report response compatibility
- Cross-manager access rejection
- Transaction-safe fixture cleanup
