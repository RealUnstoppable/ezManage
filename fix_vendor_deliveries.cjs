const fs = require('fs');
let code = fs.readFileSync('backend/index.js', 'utf8');

const badBlock = `    } catch (error) {
      logManagerError("Error in manageVendorDeliveries: ", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", error.message);
    }

    throw new HttpsError("invalid-argument", "Invalid action specified.");
  } catch (error) {
    logManagerError("Error in manageVendorDeliveries: ", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "An internal error occurred.");
  }
});`;

const goodBlock = `    } catch (error) {
      logManagerError("Error in manageVendorDeliveries: ", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", error.message);
    }
});`;

code = code.replace(badBlock, goodBlock);
fs.writeFileSync('backend/index.js', code);
