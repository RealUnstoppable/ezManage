const {getDayOfWeek, parseNum} = require("./utils");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

exports.trainGlobalAI = onSchedule("every 24 hours", async (event) => {
  console.log("Starting Global AI Training...");
  try {
    const snapshot = await admin.firestore().collection("users")
        .where("cloudSyncEnabled", "==", true)
        .where("aiTrainingEnabled", "==", true)
        .get();

    if (snapshot.empty) {
      console.log("No users opted into AI training.");
      return null;
    }

    const uniqueItems = new Set();
    const maxValues = {};
    const allHistory = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.shiftHistory) {
        allHistory.push(...data.shiftHistory);
      }
    });

    if (allHistory.length < 3) {
      console.log("Not enough global data to train.");
      return null;
    }

    // 1. Find Max Values
    allHistory.forEach((shift) => {
      if (shift.inventory && Array.isArray(shift.inventory)) {
        shift.inventory.forEach((item) => {
          if (!item.name) return;
          const name = item.name.trim();
          uniqueItems.add(name);
          if (!maxValues[name]) maxValues[name] = {bl: 0, cl: 0, fr: 0};

          const bl = parseNum(item.bl);
          const cl = parseNum(item.cl);
          const fr = parseNum(item.fr);

          if (bl > maxValues[name].bl) maxValues[name].bl = bl;
          if (cl > maxValues[name].cl) maxValues[name].cl = cl;
          if (fr > maxValues[name].fr) maxValues[name].fr = fr;
        });
      }
    });

    // 2. Format Training Data
    const trainingData = [];
    allHistory.forEach((shift) => {
      const day = getDayOfWeek(shift.date);
      if (day === -1) return;

      const input = {sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0};
      const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
      input[days[day]] = 1;

      const output = {};
      if (shift.inventory && Array.isArray(shift.inventory)) {
        shift.inventory.forEach((item) => {
          if (!item.name) return;
          const name = item.name.trim();
          const bl = parseNum(item.bl);
          const cl = parseNum(item.cl);
          const fr = parseNum(item.fr);

          output[`${name}_bl`] = maxValues[name].bl > 0 ? bl / maxValues[name].bl : 0;
          output[`${name}_cl`] = maxValues[name].cl > 0 ? cl / maxValues[name].cl : 0;
          output[`${name}_fr`] = maxValues[name].fr > 0 ? fr / maxValues[name].fr : 0;
        });
        trainingData.push({input, output});
      }
    });

    if (trainingData.length === 0) return null;

    // 3. Train
    const brain = require("brain.js");
    const net = new brain.NeuralNetwork({hiddenLayers: [10, 10]});
    net.train(trainingData, {iterations: 2000, errorThresh: 0.011});

    const modelJSON = net.toJSON();
    const exportData = {
      model: modelJSON,
      maxValues: maxValues,
      uniqueItems: Array.from(uniqueItems),
      trainedAt: new Date().toISOString(),
      totalShifts: allHistory.length,
    };

    // Save to bucket
    const bucket = admin.storage().bucket();
    const file = bucket.file("models/global_model.json");
    await file.save(JSON.stringify(exportData), {
      metadata: {contentType: "application/json"},
    });

    console.log("Global AI Training completed and saved.");
    return true;
  } catch (err) {
    console.error("Global AI Training Error:", err);
    return null;
  }
});
