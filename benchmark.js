const { performance } = require('perf_hooks');

const sleep = ms => new Promise(r => setTimeout(r, ms));

const mockTransaction = {
    get: async () => {
        await sleep(50); // Simulate network latency
        return {
            exists: () => true,
            data: () => ({ orderedCount: 5 })
        };
    },
    set: () => {},
    update: () => {}
};

const userCart = {
    'prod1': 2,
    'prod2': 1,
    'prod3': 4,
    'prod4': 1,
    'prod5': 2
};

async function originalCode() {
    const start = performance.now();
    for (const [productId, quantity] of Object.entries(userCart)) {
        const statDoc = await mockTransaction.get('dummyRef');
        if (!statDoc.exists()) {
            mockTransaction.set('dummyRef', { orderedCount: quantity });
        } else {
            const newCount = statDoc.data().orderedCount + quantity;
            mockTransaction.update('dummyRef', { orderedCount: newCount });
        }
    }
    return performance.now() - start;
}

async function optimizedCode() {
    const start = performance.now();

    // Reads
    const refs = Object.keys(userCart).map(id => 'dummyRef');
    const statDocs = await Promise.all(refs.map(ref => mockTransaction.get(ref)));

    // Writes
    let i = 0;
    for (const [productId, quantity] of Object.entries(userCart)) {
        const statDoc = statDocs[i];
        if (!statDoc.exists()) {
            mockTransaction.set('dummyRef', { orderedCount: quantity });
        } else {
            const newCount = statDoc.data().orderedCount + quantity;
            mockTransaction.update('dummyRef', { orderedCount: newCount });
        }
        i++;
    }
    return performance.now() - start;
}

async function run() {
    console.log("Running baseline...");
    const baseTime = await originalCode();
    console.log(`Baseline (Sequential): ${baseTime.toFixed(2)} ms`);

    console.log("Running optimized...");
    const optTime = await optimizedCode();
    console.log(`Optimized (Parallel): ${optTime.toFixed(2)} ms`);

    const improvement = ((baseTime - optTime) / baseTime * 100).toFixed(2);
    console.log(`Improvement: ${improvement}% faster`);
}

run();
