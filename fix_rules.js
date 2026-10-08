const fs = require('fs');

let rules = fs.readFileSync('firestore.rules', 'utf8');

// The rules file does not seem to contain duplicate "allow create" blocks for the same match,
// but it does have rules that evaluate with multiple pathways or OR conditions that bypass constraints.

// However, looking at the memory, it talks about:
// "Duplicate rule blocks for identical operations (e.g., shift_notes, maintenance_logs) bypassed intended strict constraints. A block checking both authorId and orgId was undermined by a second block checking only orgId or authorId."
// Wait, is it duplicate MATCH blocks or duplicate ALLOW blocks inside a match?
// In our 'sed' output, I see only one 'allow create' in shift_notes, maintenance_logs, incident_reports.
// Oh! Look at 'maintenance_logs':
//       allow create: if request.auth != null
//                     && request.resource.data.reportedByUid == request.auth.uid
//                     && request.resource.data.orgId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.orgId;
//
// And schedules:
//       allow create: if request.auth != null
//                     && (request.resource.data.uid == request.auth.uid || request.resource.data.authorId == request.auth.uid);
// Wait, the memory specifically says: "Duplicate allow create blocks for identical operations (e.g., shift_notes, maintenance_logs)".
