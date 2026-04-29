// Mock transaction
const mockTransaction = {
    reads: 0,
    writes: 0,
    get: async (ref) => {
        if (mockTransaction.writes > 0) {
            console.warn("WARNING: Read after write in transaction!");
        }
        mockTransaction.reads++;
        // Simulate network delay
        await new Promise(r => setTimeout(r, 50));
        return {
            exists: () => true,
            data: () => ({ orderedCount: 5 })
        };
    },
    set: (ref, data) => { mockTransaction.writes++; },
    update: (ref, data) => { mockTransaction.writes++; }
};

const userCart = {
    "prod1": 2,
    "prod2": 1,
    "prod3": 4,
    "prod4": 1,
    "prod5": 3,
};

async function originalCode() {
    mockTransaction.reads = 0;
    mockTransaction.writes = 0;

    // 1. Create a new order document
    mockTransaction.set("newOrderRef", {});

    // 2. Update product order counts
    for (const [productId, quantity] of Object.entries(userCart)) {
        const productStatRef = "ref_" + productId;
        const statDoc = await mockTransaction.get(productStatRef);
        if (!statDoc.exists()) {
            mockTransaction.set(productStatRef, { orderedCount: quantity });
        } else {
            const newCount = statDoc.data().orderedCount + quantity;
            mockTransaction.update(productStatRef, { orderedCount: newCount });
        }
    }
}

async function optimizedCode() {
    mockTransaction.reads = 0;
    mockTransaction.writes = 0;

    // PRE-FETCH ALL READS
    const cartEntries = Object.entries(userCart);
    const statDocs = await Promise.all(
        cartEntries.map(([productId, _]) => {
            const productStatRef = "ref_" + productId;
            return mockTransaction.get(productStatRef);
        })
    );

    // WRITES
    mockTransaction.set("newOrderRef", {});

    cartEntries.forEach(([productId, quantity], index) => {
        const statDoc = statDocs[index];
        const productStatRef = "ref_" + productId;
        if (!statDoc.exists()) {
            mockTransaction.set(productStatRef, { orderedCount: quantity });
        } else {
            const newCount = statDoc.data().orderedCount + quantity;
            mockTransaction.update(productStatRef, { orderedCount: newCount });
        }
    });
}

async function runBenchmark() {
    console.log("Running original code...");
    const start1 = Date.now();
    await originalCode();
    const end1 = Date.now();
    console.log(`Original code took ${end1 - start1}ms`);

    console.log("\nRunning optimized code...");
    const start2 = Date.now();
    await optimizedCode();
    const end2 = Date.now();
    console.log(`Optimized code took ${end2 - start2}ms`);
}

runBenchmark();
