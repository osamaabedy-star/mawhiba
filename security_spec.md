# Security Specification - Riyadh Al-Ebdaa Talented Platform

## Data Invariants
1. A submission must belong to an existing student and an existing test.
2. A student's national ID must be unique (integrity check in app, whitelisted in rules).
3. Questions in the bank can only be modified by a verified supervisor.
4. Settings can only be modified by a verified supervisor.
5. Students can only write their own submissions (if using auth).

## The "Dirty Dozen" Payloads (Denial Targets)
1. Attempt to delete all questions as an unauthenticated user.
2. Attempt to update another student's submission score.
3. Attempt to change app settings (primary color, min score) as a student.
4. Attempt to inject whitelisted fields into a question (e.g. usageCount) with invalid types.
5. Attempt to create a submission for a non-existent student.
6. Attempt to modify the `createdAt` field of a test after creation.
7. Attempt to bypass `isExperimental` flag on a question.
8. Attempt to read PII (National ID) of other students.
9. Attempt to create a document with a 2MB ID string.
10. Attempt to update a whitelisted key with a 1MB string.
11. Attempt to change a submission status from 'completed' to 'in_progress' to re-take.
12. Attempt to overwrite whitelisted `supervisorNotes` in a submission as a student.

## Test Runner (Logic Simulation)
The `firestore.rules` will be verified against whitelists and structure.
Since this app uses a shared supervisor model, we will define a "Supervisor" role based on the developer's email `osamaabedy@gmail.com`.
