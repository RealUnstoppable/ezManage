import { jest } from '@jest/globals';

const mockFetchUserDoc = jest.fn();
const mockCollection = jest.fn();
const mockAuth = { currentUser: null };

jest.unstable_mockModule('../auth.js', () => ({
    auth: mockAuth,
    db: { collection: mockCollection },
    fetchUserDoc: mockFetchUserDoc
}));

jest.unstable_mockModule('../utils.js', () => ({
    logManagerError: jest.fn()
}));

const { createHandoff, fetchRecentHandoffs, acknowledgeHandoff } = await import('../handoff.js');

describe('Shift Handoffs Module (js/handoff.js)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAuth.currentUser = null;
        window.firebase = {
            firestore: {
                FieldValue: {
                    serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP'),
                    arrayUnion: jest.fn(val => ['ARRAY_UNION', val])
                }
            }
        };
    });

    describe('createHandoff', () => {
        it('throws an error if the user is not authenticated', async () => {
            mockAuth.currentUser = null;
            await expect(createHandoff('Notes', 'Alert', 'Morning'))
                .rejects.toThrow('Must be logged in to access handoffs.');
        });

        it('throws an error if user profile is not found', async () => {
            mockAuth.currentUser = { uid: 'u1' };
            mockFetchUserDoc.mockResolvedValueOnce({ exists: false });

            await expect(createHandoff('Notes', 'Alert', 'Morning'))
                .rejects.toThrow('User profile not found.');
        });

        it('throws an error if user has no orgId', async () => {
            mockAuth.currentUser = { uid: 'u1' };
            mockFetchUserDoc.mockResolvedValueOnce({
                exists: true,
                data: () => ({ username: 'Alice' })
            });

            await expect(createHandoff('Notes', 'Alert', 'Morning'))
                .rejects.toThrow('User is not associated with an organization.');
        });

        it('successfully creates a shift handoff with correct payload', async () => {
            mockAuth.currentUser = { uid: 'user_123' };
            mockFetchUserDoc.mockResolvedValueOnce({
                exists: true,
                data: () => ({ username: 'ManagerBob', orgId: 'org_789' })
            });

            const mockAdd = jest.fn().mockResolvedValueOnce({ id: 'handoff_doc_999' });
            mockCollection.mockReturnValueOnce({ add: mockAdd });

            const handoffId = await createHandoff('Smooth morning shift', 'Short on buns', 'Morning');

            expect(handoffId).toBe('handoff_doc_999');
            expect(mockCollection).toHaveBeenCalledWith('shift_handoffs');
            expect(mockAdd).toHaveBeenCalledWith({
                orgId: 'org_789',
                authorId: 'user_123',
                authorName: 'ManagerBob',
                shiftType: 'Morning',
                notes: 'Smooth morning shift',
                urgentAlerts: 'Short on buns',
                createdAt: 'MOCK_TIMESTAMP',
                acknowledgedBy: []
            });
        });

        it('defaults shiftType to General and authorName to Manager if missing', async () => {
            mockAuth.currentUser = { uid: 'user_123' };
            mockFetchUserDoc.mockResolvedValueOnce({
                exists: true,
                data: () => ({ orgId: 'org_789' })
            });

            const mockAdd = jest.fn().mockResolvedValueOnce({ id: 'handoff_doc_111' });
            mockCollection.mockReturnValueOnce({ add: mockAdd });

            const handoffId = await createHandoff('', '', null);

            expect(handoffId).toBe('handoff_doc_111');
            expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
                shiftType: 'General',
                authorName: 'Manager',
                notes: '',
                urgentAlerts: ''
            }));
        });
    });

    describe('fetchRecentHandoffs', () => {
        it('throws if user is not authenticated', async () => {
            mockAuth.currentUser = null;
            await expect(fetchRecentHandoffs(5))
                .rejects.toThrow('Must be logged in to access handoffs.');
        });

        it('queries shift_handoffs by orgId ordered by createdAt desc with limit', async () => {
            mockAuth.currentUser = { uid: 'user_123' };
            mockFetchUserDoc.mockResolvedValueOnce({
                exists: true,
                data: () => ({ orgId: 'org_789' })
            });

            const mockDocs = [
                { id: 'h1', data: () => ({ shiftType: 'Morning', notes: 'All good' }) },
                { id: 'h2', data: () => ({ shiftType: 'Night', notes: 'Closing completed' }) }
            ];

            const mockLimit = jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValueOnce({ docs: mockDocs })
            });
            const mockOrderBy = jest.fn().mockReturnValue({ limit: mockLimit });
            const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });

            mockCollection.mockReturnValueOnce({ where: mockWhere });

            const results = await fetchRecentHandoffs(10);

            expect(mockCollection).toHaveBeenCalledWith('shift_handoffs');
            expect(mockWhere).toHaveBeenCalledWith('orgId', '==', 'org_789');
            expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
            expect(mockLimit).toHaveBeenCalledWith(10);
            expect(results).toEqual([
                { id: 'h1', shiftType: 'Morning', notes: 'All good' },
                { id: 'h2', shiftType: 'Night', notes: 'Closing completed' }
            ]);
        });
    });

    describe('acknowledgeHandoff', () => {
        it('throws if user is not logged in', async () => {
            mockAuth.currentUser = null;
            await expect(acknowledgeHandoff('h1'))
                .rejects.toThrow('Must be logged in to acknowledge.');
        });

        it('updates shift_handoffs document with arrayUnion of user.uid', async () => {
            mockAuth.currentUser = { uid: 'ack_user_55' };
            const mockUpdate = jest.fn().mockResolvedValueOnce(true);
            const mockDoc = jest.fn().mockReturnValue({ update: mockUpdate });

            mockCollection.mockReturnValueOnce({ doc: mockDoc });

            await acknowledgeHandoff('handoff_target_123');

            expect(mockCollection).toHaveBeenCalledWith('shift_handoffs');
            expect(mockDoc).toHaveBeenCalledWith('handoff_target_123');
            expect(mockUpdate).toHaveBeenCalledWith({
                acknowledgedBy: ['ARRAY_UNION', 'ack_user_55']
            });
        });
    });
});
