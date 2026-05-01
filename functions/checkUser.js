const admin = require("firebase-admin");

admin.initializeApp({
  projectId: "dts-hub-website",
});

async function run() {
  try {
    const userRecord = await admin.auth().getUserByEmail("catalinandrian1@gmail.com");
    console.log("Found User Auth Record:", userRecord.uid);

    const doc = await admin.firestore().collection("users").doc(userRecord.uid).get();
    if (doc.exists) {
      console.log("Firestore Data:", doc.data());
    } else {
      console.log("No document in Firestore for UID:", userRecord.uid);
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
}

run();
