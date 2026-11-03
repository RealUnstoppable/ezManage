/**
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import {
    hashVoterIdentity,
    getLocalVotes,
    saveLocalVotes,
    processAnonymousVote,
    computeLeaderboardRankings,
    renderPodiumHTML,
    renderLeaderboardListHTML
} from '../team-recognition.js';

describe('Team Recognition Podium & Anonymous Voting Engine', () => {
    beforeEach(() => {
        localStorage.clear();
        global.lucide = { createIcons: jest.fn() };
        global.escapeHTML = str => String(str).replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        }[m]));
        global.window.escapeHTML = global.escapeHTML;
    });

    describe('Anonymous Voter Token Hashing', () => {
        test('Produces consistent anonymized hash token for the same user and org', () => {
            const token1 = hashVoterIdentity('user_abc123', 'store_001');
            const token2 = hashVoterIdentity('user_abc123', 'store_001');
            expect(token1).toBe(token2);
            expect(token1).toMatch(/^anon_/);
            expect(token1).not.toContain('user_abc123'); // Identity not exposed in token
        });

        test('Produces different anonymous tokens for different users', () => {
            const tokenA = hashVoterIdentity('user_1', 'store_001');
            const tokenB = hashVoterIdentity('user_2', 'store_001');
            expect(tokenA).not.toBe(tokenB);
        });
    });

    describe('Anonymous Vote Processing & Spam Prevention', () => {
        test('Records fresh upvote (+1) and downvote (-1)', () => {
            const resUp = processAnonymousVote('emp_1', 1, { orgId: 'org_1', uid: 'user_1' });
            expect(resUp.success).toBe(true);
            expect(resUp.newScore).toBe(1);
            expect(resUp.voterVote).toBe(1);

            // Another voter downvotes
            const resDown = processAnonymousVote('emp_1', -1, { orgId: 'org_1', uid: 'user_2' });
            expect(resDown.success).toBe(true);
            expect(resDown.newScore).toBe(0); // 1 + (-1) = 0
        });

        test('Prevents duplicate spam voting: clicking Upvote twice cancels the vote', () => {
            // First upvote
            const vote1 = processAnonymousVote('emp_2', 1, { orgId: 'org_1', uid: 'user_1' });
            expect(vote1.newScore).toBe(1);
            expect(vote1.voterVote).toBe(1);

            // Second upvote from same user toggles off
            const vote2 = processAnonymousVote('emp_2', 1, { orgId: 'org_1', uid: 'user_1' });
            expect(vote2.newScore).toBe(0);
            expect(vote2.voterVote).toBe(0);
        });

        test('Switches vote from Downvote to Upvote seamlessly (+2 delta)', () => {
            // User downvotes
            processAnonymousVote('emp_3', -1, { orgId: 'org_1', uid: 'user_1' });
            let votes = getLocalVotes('org_1', 'user_1');
            expect(votes['emp_3']).toBe(-1);

            // User changes mind to upvote
            const switchVote = processAnonymousVote('emp_3', 1, { orgId: 'org_1', uid: 'user_1' });
            expect(switchVote.delta).toBe(2);
            expect(switchVote.newScore).toBe(1);
            expect(switchVote.voterVote).toBe(1);
        });
    });

    describe('Leaderboard Rankings & Podium Computation', () => {
        const mockEmployees = [
            { id: 'emp_1', name: 'Maria Santos', role: 'Shift Lead' },
            { id: 'emp_2', name: 'David Kim', role: 'Line Cook' },
            { id: 'emp_3', name: 'Chloe Taylor', role: 'Cashier' },
            { id: 'emp_4', name: 'James Wilson', role: 'Prep Cook' },
            { id: 'emp_5', name: 'Aiden Reed', role: 'Team Member' }
        ];

        const mockRecognitions = [
            { data: { type: 'Kudos', receiverId: 'emp_1' } },
            { data: { type: 'Kudos', receiverId: 'emp_1' } }, // Maria: 2 kudos = 10 pts
            { data: { type: 'Kudos', receiverId: 'emp_2' } }, // David: 1 kudos = 5 pts
            { data: { type: 'Private Feedback', receiverId: 'emp_3' } } // Feedback doesn't add public kudos
        ];

        const mockVotes = {
            'emp_1': 3,  // Maria: 10 + 3 = 13 pts (1st Gold)
            'emp_2': 4,  // David: 5 + 4 = 9 pts (2nd Silver)
            'emp_3': 6,  // Chloe: 0 + 6 = 6 pts (3rd Bronze)
            'emp_4': 2,  // James: 0 + 2 = 2 pts (4th)
            'emp_5': -1  // Aiden: 0 - 1 = -1 pts (5th)
        };

        test('Correctly identifies 1st Place (Gold), 2nd Place (Silver), and 3rd Place (Bronze)', () => {
            const result = computeLeaderboardRankings(mockEmployees, mockRecognitions, mockVotes);

            expect(result.firstPlace.name).toBe('Maria Santos');
            expect(result.firstPlace.totalPoints).toBe(13);
            expect(result.firstPlace.rank).toBe(1);

            expect(result.secondPlace.name).toBe('David Kim');
            expect(result.secondPlace.totalPoints).toBe(9);
            expect(result.secondPlace.rank).toBe(2);

            expect(result.thirdPlace.name).toBe('Chloe Taylor');
            expect(result.thirdPlace.totalPoints).toBe(6);
            expect(result.thirdPlace.rank).toBe(3);

            expect(result.remaining).toHaveLength(2);
            expect(result.remaining[0].name).toBe('James Wilson');
            expect(result.remaining[1].name).toBe('Aiden Reed');
        });
    });

    describe('HTML Podium & Leaderboard Rendering', () => {
        test('Renders Duolingo-style visual 3-step podium with Gold/Silver/Bronze badges', () => {
            const mockRankings = {
                firstPlace: { id: 'emp_1', name: 'Maria Santos', role: 'Shift Lead', kudos: 2, totalPoints: 13 },
                secondPlace: { id: 'emp_2', name: 'David Kim', role: 'Line Cook', kudos: 1, totalPoints: 9 },
                thirdPlace: { id: 'emp_3', name: 'Chloe Taylor', role: 'Cashier', kudos: 0, totalPoints: 6 }
            };

            const html = renderPodiumHTML(mockRankings);

            expect(html).toContain('👑 1ST PLACE');
            expect(html).toContain('🥈 2ND');
            expect(html).toContain('🥉 3RD');
            expect(html).toContain('Maria Santos');
            expect(html).toContain('David Kim');
            expect(html).toContain('Chloe Taylor');
            expect(html).toContain('data-action="vote"');
        });

        test('Renders clean remaining leaderboard list with voting buttons', () => {
            const remaining = [
                { id: 'emp_4', rank: 4, name: 'James Wilson', role: 'Prep Cook', kudos: 1, totalPoints: 4 }
            ];

            const html = renderLeaderboardListHTML(remaining);

            expect(html).toContain('#4');
            expect(html).toContain('James Wilson');
            expect(html).toContain('Prep Cook');
            expect(html).toContain('arrow-big-up');
            expect(html).toContain('arrow-big-down');
        });
    });
});
