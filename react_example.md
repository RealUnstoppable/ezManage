import React, { useState, useEffect } from 'react';
import { db } from './firebase'; // Assume you have a configured firebase instance here
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs } from 'firebase/firestore';

/**
 * Example React Component for creating a Shift Note.
 *
 * Demonstrates:
 * 1. Optimistic UI update and reversion if the server-side write fails.
 * 2. Proper async/await resolution to ensure writes complete.
 * 3. Fetching and re-rendering on successful update.
 */
function ShiftNotesManager({ currentUser, currentUserData }) {
    const [shiftNotes, setShiftNotes] = useState([]);
    const [noteContent, setNoteContent] = useState('');
    const [priority, setPriority] = useState('Normal');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initial load
    useEffect(() => {
        if (currentUserData?.orgId) {
            fetchShiftNotes();
        }
    }, [currentUserData?.orgId]);

    const fetchShiftNotes = async () => {
        if (!currentUserData?.orgId) return;

        try {
            const q = query(
                collection(db, 'shift_notes'),
                where('orgId', '==', currentUserData.orgId),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const notes = [];
            querySnapshot.forEach((doc) => {
                notes.push({ id: doc.id, ...doc.data() });
            });
            setShiftNotes(notes);
        } catch (error) {
            console.error("Failed to fetch shift notes", error);
        }
    };

    const submitShiftNote = async (e) => {
        e.preventDefault();

        if (!currentUser || !currentUserData || !currentUserData.orgId) {
            alert("You must be logged in and part of a group to post a shift note.");
            return;
        }

        const trimmedContent = noteContent.trim();
        if (!trimmedContent) {
            alert("Please enter note content.");
            return;
        }

        // 1. Prepare optimistic state
        const tempId = `temp-${Date.now()}`;
        const newNote = {
            id: tempId,
            authorId: currentUser.uid,
            authorName: currentUser.email.split('@')[0],
            content: trimmedContent,
            priority: priority,
            status: 'Active',
            orgId: currentUserData.orgId,
            createdAt: new Date() // Fake timestamp for immediate render
        };

        // 2. Apply optimistic UI update
        setShiftNotes([newNote, ...shiftNotes]);

        // 3. Clear form inputs (temporarily storing in case of rollback)
        const previousContent = trimmedContent;
        setNoteContent('');
        setIsSubmitting(true);

        try {
            // 4. Perform the actual async write. We 'await' here completely before doing anything else.
            await addDoc(collection(db, 'shift_notes'), {
                authorId: currentUser.uid,
                authorName: currentUser.email.split('@')[0],
                content: trimmedContent,
                priority: priority,
                status: 'Active',
                orgId: currentUserData.orgId,
                createdAt: serverTimestamp(),
                timestamp: serverTimestamp() // Compatibility field
            });

            // 5. On success, trigger a fresh fetch to ensure consistency with other clients
            await fetchShiftNotes();

        } catch (error) {
            // 6. Rollback optimistic UI if network request fails
            console.error("Error posting note", error);

            // Remove the temporary note
            setShiftNotes((prevNotes) => prevNotes.filter(note => note.id !== tempId));

            // Restore the content to the input
            setNoteContent(previousContent);

            if (error.code === 'unavailable' || error.code === 'auth/network-request-failed') {
                alert("Network error: Could not connect to the server. Please check your connection.");
            } else {
                alert("Failed to post note: " + error.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="shift-notes-container">
            <h2>Post a Note</h2>
            <form onSubmit={submitShiftNote}>
                <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Leave a note, warning, or handover instruction..."
                    disabled={isSubmitting}
                />
                <div>
                    <select value={priority} onChange={(e) => setPriority(e.target.value)} disabled={isSubmitting}>
                        <option value="Normal">Normal Priority</option>
                        <option value="Urgent">🚨 Urgent Issue</option>
                    </select>
                    <button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Post Note'}
                    </button>
                </div>
            </form>

            <div className="active-notes">
                <h3>Active Notes</h3>
                {shiftNotes.map(note => (
                    <div key={note.id} className={`note-card ${note.priority === 'Urgent' ? 'urgent' : ''}`}>
                        <p><strong>{note.authorName}</strong></p>
                        <p>{note.content}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ShiftNotesManager;