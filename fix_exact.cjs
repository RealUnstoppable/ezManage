const fs = require('fs');
let code = fs.readFileSync('backend/index.js', 'utf8');

const shiftGroupsEnd = `    } catch (error) {
      logManagerError("Shift Groups Error for uid:", uid, error);

      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", error.message);
    }
    throw new HttpsError("internal", "An internal error occurred.");
  }
});`;

const shiftGroupsGood = `    } catch (error) {
      logManagerError("Shift Groups Error for uid:", uid, error);

      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", error.message);
    }
});`;

code = code.replace(shiftGroupsEnd, shiftGroupsGood);

const incidentsEnd = `    } catch (error) {
      logManagerError("Manage Incidents Error for uid:", uid, error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", error.message);
    }
    throw new HttpsError("internal", "An internal error occurred.");
  }
});`;

const incidentsGood = `    } catch (error) {
      logManagerError("Manage Incidents Error for uid:", uid, error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", error.message);
    }
});`;

code = code.replace(incidentsEnd, incidentsGood);

const timeLogsEnd = `    } catch (error) {
      logManagerError(\`Manage Time Logs Error for uid: \${uid}\`, error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", error.message);
    }
    throw new HttpsError("internal", "An internal error occurred.");
  }
});`;

const timeLogsGood = `    } catch (error) {
      logManagerError(\`Manage Time Logs Error for uid: \${uid}\`, error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", error.message);
    }
});`;

code = code.replace(timeLogsEnd, timeLogsGood);

fs.writeFileSync('backend/index.js', code);
