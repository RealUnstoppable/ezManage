/**
 * ezManage Team Recognition Leaderboard & Anonymous Voting Engine
 * Implements a Duolingo-style visual 3-step podium (Gold 1st, Silver 2nd, Bronze 3rd),
 * ranked leaderboard list, and strictly anonymous upvote/downvote processing.
 */

/**
 * Creates an anonymous hash token for a user to prevent double voting
 * without storing or exposing voter identity in the public UI.
 */
export function hashVoterIdentity(uid, orgId = 'default') {
    if (!uid) return 'anon_guest';
    let hash = 0;
    const str = `${uid}_salt_ezmanage_${orgId}`;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return 'anon_' + Math.abs(hash).toString(36);
}

/**
 * Retrieves the current voter's locally recorded votes for an organization
 */
export function getLocalVotes(orgId = 'default', uid = '') {
    const voterToken = hashVoterIdentity(uid, orgId);
    try {
        const key = `ezManage_votes_${orgId}_${voterToken}`;
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        return {};
    }
}

/**
 * Saves the current voter's locally recorded votes
 */
export function saveLocalVotes(orgId = 'default', uid = '', votes = {}) {
    const voterToken = hashVoterIdentity(uid, orgId);
    try {
        const key = `ezManage_votes_${orgId}_${voterToken}`;
        localStorage.setItem(key, JSON.stringify(votes));
    } catch (e) {}
}

/**
 * Retrieves aggregated public vote tallies for employees in an organization
 */
export function getAggregatedVotes(orgId = 'default') {
    try {
        const key = `ezManage_employee_votes_${orgId || 'default'}`;
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        return {};
    }
}

/**
 * Saves aggregated public vote tallies for an organization
 */
export function saveAggregatedVotes(orgId = 'default', voteTallies = {}) {
    try {
        const key = `ezManage_employee_votes_${orgId || 'default'}`;
        localStorage.setItem(key, JSON.stringify(voteTallies));
    } catch (e) {}
}

/**
 * Processes an anonymous vote (+1 upvote or -1 downvote) for an employee.
 * Prevents spam/duplicate voting by toggling or replacing prior vote.
 * 
 * @param {string} employeeId Target employee ID
 * @param {number} direction +1 for Upvote, -1 for Downvote
 * @param {Object} context { orgId, uid, db }
 * @returns {Object} Result of the vote operation
 */
export function processAnonymousVote(employeeId, direction, context = {}) {
    if (!employeeId) return { success: false, error: 'Invalid employee ID' };

    const { orgId = 'default', uid = 'guest', db = null } = context;
    const voterVotes = getLocalVotes(orgId, uid);
    const aggregated = getAggregatedVotes(orgId);

    const currentVoterVote = voterVotes[employeeId] || 0; // 0, 1, or -1
    let delta = 0;
    let newVoterVote = 0;

    if (direction > 0) {
        // Upvote clicked
        if (currentVoterVote === 1) {
            // Cancel existing upvote
            delta = -1;
            newVoterVote = 0;
        } else if (currentVoterVote === -1) {
            // Switch from downvote to upvote
            delta = 2;
            newVoterVote = 1;
        } else {
            // Fresh upvote
            delta = 1;
            newVoterVote = 1;
        }
    } else {
        // Downvote clicked
        if (currentVoterVote === -1) {
            // Cancel existing downvote
            delta = 1;
            newVoterVote = 0;
        } else if (currentVoterVote === 1) {
            // Switch from upvote to downvote
            delta = -2;
            newVoterVote = -1;
        } else {
            // Fresh downvote
            delta = -1;
            newVoterVote = -1;
        }
    }

    // Update voter's record
    if (newVoterVote === 0) {
        delete voterVotes[employeeId];
    } else {
        voterVotes[employeeId] = newVoterVote;
    }
    saveLocalVotes(orgId, uid, voterVotes);

    // Update aggregated tally
    const currentScore = aggregated[employeeId] || 0;
    const newScore = currentScore + delta;
    aggregated[employeeId] = newScore;
    saveAggregatedVotes(orgId, aggregated);

    // Sync to Firestore if online
    if (db && orgId && orgId !== 'demo-org') {
        try {
            const voteDocRef = db.collection('employee_votes').doc(`${orgId}_${employeeId}`);
            voteDocRef.set({
                employeeId,
                orgId,
                score: newScore,
                updatedAt: new Date().toISOString()
            }, { merge: true }).catch(err => console.warn("Firestore vote sync notice:", err));
        } catch (e) {
            console.warn("Async firestore vote sync catch:", e);
        }
    }

    return {
        success: true,
        employeeId,
        newScore,
        voterVote: newVoterVote,
        delta
    };
}

/**
 * Computes ranked leaderboard from employees, kudos recognitions, and anonymous votes.
 */
export function computeLeaderboardRankings(employees = [], recognitions = [], votesMap = {}) {
    if (!Array.isArray(employees)) return { ranked: [], podium: [], remaining: [] };

    // Calculate kudos counts per employee
    const kudosCounts = {};
    if (Array.isArray(recognitions)) {
        recognitions.forEach(rec => {
            const data = rec.data || rec;
            if (data.type === 'Kudos') {
                const recId = data.receiverId || '';
                const recName = (data.receiverName || '').trim().toLowerCase();
                if (recId) {
                    kudosCounts[recId] = (kudosCounts[recId] || 0) + 1;
                }
                if (recName) {
                    kudosCounts[recName] = (kudosCounts[recName] || 0) + 1;
                }
            }
        });
    }

    // Map and score employees
    const scoredEmployees = employees.map(emp => {
        const id = emp.id || ('emp_' + Math.random().toString(36).substr(2, 6));
        const name = emp.name || emp.fullName || 'Team Member';
        const role = emp.role || emp.position || 'Staff';
        const lowerName = name.trim().toLowerCase();

        const kudos = (kudosCounts[id] || 0) + (kudosCounts[lowerName] || 0);
        const voteScore = parseInt(votesMap[id], 10) || 0;

        // Points formula: Kudos * 5 + Anonymous Vote score
        const totalPoints = (kudos * 5) + voteScore;

        return {
            id,
            name,
            role,
            kudos,
            voteScore,
            totalPoints
        };
    });

    // Sort descending by totalPoints; tie-break alphabetically by name
    scoredEmployees.sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        return a.name.localeCompare(b.name);
    });

    // Assign ranks
    const ranked = scoredEmployees.map((emp, index) => ({
        ...emp,
        rank: index + 1
    }));

    // Top 3 Podium layout: 2nd place (left), 1st place (center), 3rd place (right)
    const firstPlace = ranked[0] || null;
    const secondPlace = ranked[1] || null;
    const thirdPlace = ranked[2] || null;
    const remaining = ranked.slice(3);

    return {
        ranked,
        podium: [secondPlace, firstPlace, thirdPlace].filter(Boolean),
        firstPlace,
        secondPlace,
        thirdPlace,
        remaining
    };
}

/**
 * Generates initials avatar string from employee name
 */
export function getInitials(name = '') {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Renders the Duolingo-style 3-Step Podium HTML
 */
export function renderPodiumHTML(rankings, userVotes = {}) {
    const { firstPlace, secondPlace, thirdPlace } = rankings;

    if (!firstPlace && !secondPlace && !thirdPlace) {
        return `
            <div class="text-center py-12 bg-slate-900/50 rounded-3xl border border-slate-800">
                <i data-lucide="trophy" class="w-12 h-12 text-slate-600 mx-auto mb-3"></i>
                <h4 class="text-lg font-bold text-white mb-1">Leaderboard Warming Up</h4>
                <p class="text-xs text-slate-400">Add employees to your team directory to unlock the podium!</p>
            </div>
        `;
    }

    const renderCard = (emp, place) => {
        if (!emp) {
            return `
                <div class="flex-1 flex flex-col items-center justify-end opacity-40">
                    <div class="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 mb-3">
                        <i data-lucide="user" class="w-8 h-8"></i>
                    </div>
                    <div class="text-xs font-bold text-slate-500 mb-2">Unassigned</div>
                    <div class="w-full bg-slate-900 border border-slate-800 rounded-t-2xl flex items-center justify-center text-slate-600 font-black text-2xl h-24">
                        ${place}
                    </div>
                </div>
            `;
        }

        const isFirst = place === 1;
        const isSecond = place === 2;
        const isThird = place === 3;

        const pillarHeight = isFirst ? 'h-48 md:h-56' : isSecond ? 'h-36 md:h-44' : 'h-28 md:h-36';
        
        const medalBadge = isFirst
            ? `<div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/30 flex items-center gap-1 z-10 whitespace-nowrap">👑 1ST PLACE</div>`
            : isSecond
            ? `<div class="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-slate-200 to-slate-400 text-slate-950 shadow-md flex items-center gap-1 z-10 whitespace-nowrap">🥈 2ND</div>`
            : `<div class="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-600 to-orange-700 text-white shadow-md flex items-center gap-1 z-10 whitespace-nowrap">🥉 3RD</div>`;

        const avatarBorder = isFirst
            ? 'border-4 border-amber-400 shadow-xl shadow-amber-500/20 bg-amber-500/10 text-amber-300'
            : isSecond
            ? 'border-4 border-slate-300 shadow-md bg-slate-800 text-slate-200'
            : 'border-4 border-amber-700 shadow-md bg-orange-950/40 text-amber-500';

        const pillarBg = isFirst
            ? 'bg-gradient-to-t from-amber-500/20 via-amber-900/30 to-amber-500/30 border-2 border-amber-400/50 shadow-2xl shadow-amber-500/10'
            : isSecond
            ? 'bg-gradient-to-t from-slate-800/80 via-slate-800 to-slate-700/60 border border-slate-600/50'
            : 'bg-gradient-to-t from-orange-950/30 to-amber-900/20 border border-amber-700/40';

        const voterVote = userVotes[emp.id] || 0;
        const upvoteActive = voterVote === 1 ? 'text-amber-400 bg-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800';
        const downvoteActive = voterVote === -1 ? 'text-rose-400 bg-rose-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800';

        return `
            <div class="flex-1 flex flex-col items-center justify-end relative group transition-transform duration-200 hover:-translate-y-1">
                ${medalBadge}
                
                <!-- Avatar & Details -->
                <div class="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center font-black text-xl md:text-2xl mb-2.5 ${avatarBorder} relative">
                    ${getInitials(emp.name)}
                </div>

                <div class="text-center px-1 mb-3">
                    <h4 class="font-black text-xs md:text-sm text-white truncate max-w-[110px] md:max-w-[140px]">${escapeHTML(emp.name)}</h4>
                    <span class="text-[10px] text-slate-400 uppercase tracking-wider block truncate max-w-[100px] md:max-w-[130px]">${escapeHTML(emp.role)}</span>
                </div>

                <!-- Anonymous Voting Controls -->
                <div class="flex items-center gap-1 mb-3 bg-slate-900/90 border border-slate-800 rounded-xl px-2 py-1 shadow-sm">
                    <button data-action="vote" data-id="${escapeHTML(emp.id)}" data-dir="1"
                        class="p-1 rounded-lg transition-colors ${upvoteActive}" aria-label="Upvote ${escapeHTML(emp.name)}">
                        <i data-lucide="arrow-big-up" class="w-4 h-4"></i>
                    </button>
                    <span class="font-mono font-bold text-xs px-1 text-slate-200" id="vote-score-${escapeHTML(emp.id)}">
                        ${emp.totalPoints >= 0 ? '+' : ''}${emp.totalPoints}
                    </span>
                    <button data-action="vote" data-id="${escapeHTML(emp.id)}" data-dir="-1"
                        class="p-1 rounded-lg transition-colors ${downvoteActive}" aria-label="Downvote ${escapeHTML(emp.name)}">
                        <i data-lucide="arrow-big-down" class="w-4 h-4"></i>
                    </button>
                </div>

                <!-- Podium Pillar -->
                <div class="w-full ${pillarBg} rounded-t-3xl flex flex-col items-center justify-center text-center p-2 ${pillarHeight} transition-all">
                    <span class="text-3xl md:text-4xl font-black ${isFirst ? 'text-amber-400' : isSecond ? 'text-slate-300' : 'text-amber-600'}">
                        #${place}
                    </span>
                    <span class="text-[11px] font-bold text-slate-400 mt-1">
                        ${emp.kudos} Kudos
                    </span>
                </div>
            </div>
        `;
    };

    return `
        <div class="w-full pt-8 pb-4">
            <div class="flex items-end justify-center gap-3 md:gap-6 max-w-2xl mx-auto px-2">
                ${renderCard(secondPlace, 2)}
                ${renderCard(firstPlace, 1)}
                ${renderCard(thirdPlace, 3)}
            </div>
        </div>
    `;
}

/**
 * Renders the ranked leaderboard list for employees outside the top 3
 */
export function renderLeaderboardListHTML(remainingEmployees = [], userVotes = {}) {
    if (!remainingEmployees || remainingEmployees.length === 0) {
        return `
            <div class="p-6 text-center text-xs text-slate-500 italic">
                All ranked team members are highlighted on the podium above.
            </div>
        `;
    }

    const rows = remainingEmployees.map(emp => {
        const voterVote = userVotes[emp.id] || 0;
        const upvoteActive = voterVote === 1 ? 'text-amber-400 bg-amber-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800';
        const downvoteActive = voterVote === -1 ? 'text-rose-400 bg-rose-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800';

        return `
            <div class="flex items-center justify-between p-4 bg-slate-900 border border-slate-800/80 rounded-2xl hover:border-slate-700 transition-colors">
                <div class="flex items-center gap-3.5 min-w-0">
                    <span class="w-7 text-center font-mono font-black text-sm text-slate-400">#${emp.rank}</span>
                    <div class="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-slate-300 shrink-0">
                        ${getInitials(emp.name)}
                    </div>
                    <div class="min-w-0">
                        <h5 class="font-bold text-sm text-white truncate">${escapeHTML(emp.name)}</h5>
                        <p class="text-xs text-slate-400 truncate">${escapeHTML(emp.role)}</p>
                    </div>
                </div>

                <div class="flex items-center gap-4 shrink-0">
                    <span class="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        <i data-lucide="award" class="w-3.5 h-3.5"></i> ${emp.kudos} Kudos
                    </span>

                    <div class="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
                        <button data-action="vote" data-id="${escapeHTML(emp.id)}" data-dir="1"
                            class="p-1 rounded-lg transition-colors ${upvoteActive}" aria-label="Upvote ${escapeHTML(emp.name)}">
                            <i data-lucide="arrow-big-up" class="w-4 h-4"></i>
                        </button>
                        <span class="font-mono font-bold text-xs px-1 text-slate-200" id="vote-score-${escapeHTML(emp.id)}">
                            ${emp.totalPoints >= 0 ? '+' : ''}${emp.totalPoints}
                        </span>
                        <button data-action="vote" data-id="${escapeHTML(emp.id)}" data-dir="-1"
                            class="p-1 rounded-lg transition-colors ${downvoteActive}" aria-label="Downvote ${escapeHTML(emp.name)}">
                            <i data-lucide="arrow-big-down" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `<div class="space-y-2.5">${rows}</div>`;
}

// Global browser window fallback
if (typeof window !== 'undefined') {
    window.TeamRecognition = {
        hashVoterIdentity,
        getLocalVotes,
        saveLocalVotes,
        getAggregatedVotes,
        saveAggregatedVotes,
        processAnonymousVote,
        computeLeaderboardRankings,
        renderPodiumHTML,
        renderLeaderboardListHTML
    };
}
