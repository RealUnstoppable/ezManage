/**
 * ezManage Direct Client-Side Shift Report PDF Generator
 * Replaces window.print() with high-fidelity, popup-free PDF export via jsPDF
 */

export async function generateShiftPDF(state, options = {}) {
    let jsPDFClass = null;

    if (typeof window !== 'undefined' && window.jspdf && window.jspdf.jsPDF) {
        jsPDFClass = window.jspdf.jsPDF;
    } else if (typeof globalThis !== 'undefined' && globalThis.jspdf && globalThis.jspdf.jsPDF) {
        jsPDFClass = globalThis.jspdf.jsPDF;
    } else {
        try {
            const { createRequire } = await import('module');
            const req = createRequire(import.meta.url);
            const jspdfModule = req('jspdf');
            jsPDFClass = jspdfModule.jsPDF || jspdfModule;
        } catch (e) {
            try {
                const mod = await import('jspdf');
                jsPDFClass = mod.jsPDF || mod.default?.jsPDF;
            } catch (e2) {
                console.warn("Could not import jspdf dynamically:", e2);
            }
        }
    }

    if (!jsPDFClass) {
        throw new Error("PDF generator engine (jsPDF) is unavailable in current environment.");
    }

    const doc = new jsPDFClass({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    const primaryColor = [15, 23, 42];     // #0f172a
    const accentColor = [14, 165, 233];    // #0ea5e9
    const lightBg = [248, 250, 252];       // #f8fafc
    const textDark = [30, 41, 59];         // #1e293b
    const textMuted = [100, 116, 139];     // #64748b
    const borderGray = [226, 232, 240];    // #e2e8f0

    // Top Header Banner
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 32, 'F');

    // Accent line
    doc.setFillColor(...accentColor);
    doc.rect(0, 32, 210, 2, 'F');

    // Brand Title
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("ezManage", 15, 18);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 225, 245);
    doc.text("STORE OPERATIONS & AUDIT TRAIL REPORT", 15, 25);

    const printDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`CONFIDENTIAL • GENERATED ${printDate}`, 195, 25, { align: "right" });

    // Meta Grid Card
    doc.setFillColor(...lightBg);
    doc.roundedRect(15, 38, 180, 26, 3, 3, 'F');
    doc.setDrawColor(...borderGray);
    doc.roundedRect(15, 38, 180, 26, 3, 3, 'S');

    doc.setTextColor(...textMuted);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("SHIFT MANAGER", 20, 44);
    doc.text("DATE & SHIFT TIME", 70, 44);
    doc.text("STORE / LOCATION", 125, 44);
    doc.text("SHIFT DURATION", 165, 44);

    doc.setTextColor(...textDark);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.text(String(state.manager || "Store Manager"), 20, 52);
    doc.text(`${state.dateSaved || "Today"} • ${state.timeSaved || "N/A"}`, 70, 52);

    let storeName = "Store #101";
    if (typeof window !== 'undefined' && window.currentUserData) {
        storeName = window.currentUserData.storeName || window.currentUserData.orgId || storeName;
    }
    doc.text(String(storeName), 125, 52);
    doc.text(`${state.durationMins || 0} mins`, 165, 52);

    let y = 72;

    // Helper: Page boundary check
    function ensureSpace(neededMm) {
        if (y + neededMm > 275) {
            doc.addPage();
            y = 20;
        }
    }

    // Section 1: Financial & Register Audit Trail
    ensureSpace(20);
    doc.setFillColor(...primaryColor);
    doc.rect(15, y, 180, 6.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("FINANCIAL & REGISTER AUDIT TRAIL", 20, y + 4.5);
    y += 11;

    // Safe & Change Info
    doc.setFontSize(8.5);
    doc.setTextColor(...textDark);
    doc.text(`Safe Count: ${state.safeCount || '$0.00'}`, 20, y);
    const changeStr = state.changeNeeded ? String(state.changeNeeded).replace(/[\r\n]+/g, ' ') : 'None logged';
    doc.text(`Change Needed: ${changeStr}`, 90, y);
    y += 7;

    // Register Drawers Table
    if (state.drawers && state.drawers.length > 0) {
        ensureSpace(15);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...textMuted);
        doc.text("REGISTER DRAWER", 20, y);
        doc.text("COUNTED ($)", 85, y);
        doc.text("STATUS / VARIANCE", 140, y);
        y += 3.5;
        doc.setDrawColor(...borderGray);
        doc.line(20, y, 190, y);
        y += 4.5;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(...textDark);
        state.drawers.forEach(d => {
            ensureSpace(6);
            doc.text(String(d.name || "Drawer"), 20, y);
            doc.text(`\$${d.val || '0.00'}`, 85, y);
            doc.text(String(d.res || "Balanced"), 140, y);
            y += 5;
        });
        y += 3;
    }

    // Verified Deposits Table
    if (state.deposits && state.deposits.length > 0) {
        ensureSpace(15);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...textMuted);
        doc.text("DEPOSIT AMOUNT", 20, y);
        doc.text("VERIFIED (VER)", 85, y);
        doc.text("VALIDATED (VAL)", 140, y);
        y += 3.5;
        doc.setDrawColor(...borderGray);
        doc.line(20, y, 190, y);
        y += 4.5;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(...textDark);
        state.deposits.forEach(dep => {
            ensureSpace(6);
            doc.text(`\$${dep.val || '0.00'}`, 20, y);
            const verStamp = dep.ver ? (dep.verTimestamp ? `VERIFIED [${new Date(dep.verTimestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}]` : "VERIFIED ✓") : "Pending";
            const valStamp = dep.valCheck ? (dep.valTimestamp ? `VALIDATED [${new Date(dep.valTimestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}]` : "VALIDATED ✓") : "Pending";
            doc.text(verStamp, 85, y);
            doc.text(valStamp, 140, y);
            y += 5;
        });
        y += 3;
    }

    // Section 2: Routine & ServSafe
    ensureSpace(18);
    doc.setFillColor(...primaryColor);
    doc.rect(15, y, 180, 6.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    const completedRoutines = (state.routines || []).filter(r => r.checked).length;
    doc.text(`ROUTINE & SERVSAFE COMPLIANCE (${completedRoutines}/${(state.routines || []).length} Completed)`, 20, y + 4.5);
    y += 10;

    if (state.routines && state.routines.length > 0) {
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...textDark);
        state.routines.forEach(r => {
            ensureSpace(5);
            const mark = r.checked ? "[X]" : "[ ]";
            doc.setFont("helvetica", r.checked ? "bold" : "normal");
            doc.text(`${mark}  ${r.name}`, 20, y);
            y += 4.5;
        });
        y += 3;
    }

    // Section 3: Prep & Labor
    ensureSpace(18);
    doc.setFillColor(...primaryColor);
    doc.rect(15, y, 180, 6.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("PREP & LABOR SUMMARY", 20, y + 4.5);
    y += 10;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textDark);
    doc.text(`Main Prep (Cooked): ${state.beefCook || 'N/A'}`, 20, y);
    doc.text(`Tempered / Thawed: ${state.beefTempered || 'N/A'}`, 85, y);
    doc.text(`Labor Variance: ${state.laborVariance || 'N/A'}`, 140, y);
    y += 6;
    if (state.prepNotes) {
        doc.setFont("helvetica", "italic");
        const cleanNotes = String(state.prepNotes).replace(/[\r\n]+/g, ' ');
        doc.text(`Prep Notes: ${cleanNotes}`, 20, y, { maxWidth: 170 });
        y += 7;
    }

    // Section 4: Inventory Log
    if (state.inventory && state.inventory.length > 0) {
        ensureSpace(20);
        doc.setFillColor(...primaryColor);
        doc.rect(15, y, 180, 6.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.text(`INVENTORY LOG (${state.inventory.length} Items Counted)`, 20, y + 4.5);
        y += 10;

        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...textMuted);
        doc.text("ITEM NAME", 20, y);
        doc.text("FRONTLINE", 85, y);
        doc.text("COOLER", 125, y);
        doc.text("FREEZER", 165, y);
        y += 3.5;
        doc.setDrawColor(...borderGray);
        doc.line(20, y, 190, y);
        y += 4.5;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(...textDark);
        state.inventory.forEach(item => {
            ensureSpace(5);
            doc.text(String(item.name || "Item"), 20, y);
            doc.text(String(item.bl || "-"), 85, y);
            doc.text(String(item.cl || "-"), 125, y);
            doc.text(String(item.fr || "-"), 165, y);
            y += 4.5;
        });
        y += 3;
    }

    // Page numbering and footer stamps
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setTextColor(...textMuted);
        doc.text(`ezManage v2.4.0 • Audit ID: ${state.id || 'N/A'} • Page ${p} of ${totalPages}`, 105, 290, { align: "center" });
    }

    const safeDate = String(state.dateSaved || 'shift').replace(/[\/\\:\s]/g, '-');
    const safeMgr = String(state.manager || 'Manager').replace(/[\/\\:\s]/g, '_');
    const filename = `ezManage_Shift_${safeDate}_${safeMgr}.pdf`;

    if (!options.returnDocOnly && typeof doc.save === 'function') {
        doc.save(filename);
    }

    return { doc, filename, totalPages };
}

if (typeof window !== 'undefined') {
    window.generateShiftPDF = generateShiftPDF;
}
