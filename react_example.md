# React Component Example: ShiftNotesManager

Here is a refactored example of how to handle the \`ShiftNotesManager\` component using React, properly utilizing \`async/await\` and robust error catching for Firestore operations before any UI state redirects or transitions.

\`\`\`jsx
import React, { useState } from 'react';
import { db } from './firebase'; // Ensure your db is exported from firebase.js
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function ShiftNotesManager({ currentUser, currentUserData }) {
    const [content, setContent] = useState('');
    const [priority, setPriority] = useState('Normal');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const submitShiftNote = async (e) => {
        e.preventDefault();

        if (!currentUser || !currentUserData || !currentUserData.orgId) {
            setError("You must be logged in and part of a group to post a shift note.");
            return;
        }

        if (!content.trim()) {
            setError("Please enter note content.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // Wait for the document to be successfully written to Firestore
            await addDoc(collection(db, 'shift_notes'), {
                authorId: currentUser.uid,
                authorName: currentUser.email.split('@')[0],
                content: content.trim(),
                priority: priority,
                status: 'Active',
                orgId: currentUserData.orgId,
                createdAt: serverTimestamp(),
                timestamp: serverTimestamp()
            });

            // Reset form only after successful write
            setContent('');
            setPriority('Normal');

            // e.g. onSuccessRedirect() or reload local state

        } catch (err) {
            console.error("Error posting note", err);

            // Handle specific network/CORS/firestore unavailable errors
            if (
                err.code === 'unavailable' ||
                err.code === 'auth/network-request-failed' ||
                err.code === 'firestore/unavailable'
            ) {
                setError("Network error: Could not connect to the server. Please check your connection.");
            } else {
                setError("Failed to post note: " + err.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={submitShiftNote}>
            {error && <div className="error">{error}</div>}

            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter shift note..."
                disabled={isSubmitting}
            />

            <select value={priority} onChange={(e) => setPriority(e.target.value)} disabled={isSubmitting}>
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
            </select>

            <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Posting...' : 'Post Note'}
            </button>
        </form>
    );
}
\`\`\`
