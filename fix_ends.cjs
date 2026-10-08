const fs = require('fs');
let code = fs.readFileSync('backend/index.js', 'utf8');

const badShiftGroupsEnd = `      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", error.message);
    }
    throw new HttpsError("internal", "An internal error occurred.");
  }
});`;

const goodShiftGroupsEnd = `      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", error.message);
    }
    throw new HttpsError("internal", "An internal error occurred.");
});`;

// This will match and fix manageShiftGroups
code = code.replace(badShiftGroupsEnd, goodShiftGroupsEnd);

// For manageIncidents, it's slightly different
const badIncidentsEnd = `      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", error.message);
    }
    throw new HttpsError("internal", "An internal error occurred.");
  }
});`;

code = code.replace(badIncidentsEnd, goodShiftGroupsEnd);

fs.writeFileSync('backend/index.js', code);
