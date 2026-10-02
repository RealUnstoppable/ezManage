const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const searchBlock = `            // Remove empty state message if it exists
            const emptyState = container.querySelector('.text-center.py-16');
            if (emptyState) emptyState.remove();

            container.prepend(noteDiv);
            if (window.lucide) window.lucide.createIcons();
            // Store the content so we can restore it if the write fails
            const previousContent = document.getElementById('shiftNoteContent').value;
            document.getElementById('shiftNoteContent').value = "";

            try {
                // Ensure write fully completes before allowing further actions or redirects to avoid race conditions.`;

const replacementBlock = `            // Remove empty state message if it exists
            const emptyState = container.querySelector('.text-center.py-16');
            if (emptyState) emptyState.remove();

            container.prepend(noteDiv);

            const submitBtn = document.querySelector('#view-shiftNotes button[onclick="submitShiftNote()"]');
            const originalText = submitBtn ? submitBtn.innerHTML : "Post Note";
            if (submitBtn) {
                submitBtn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Posting...';
                submitBtn.disabled = true;
            }
            if (window.lucide) window.lucide.createIcons();
            // Store the content so we can restore it if the write fails
            const previousContent = document.getElementById('shiftNoteContent').value;
            document.getElementById('shiftNoteContent').value = "";

            try {
                // Ensure write fully completes before allowing further actions or redirects to avoid race conditions.`;

content = content.replace(searchBlock, replacementBlock);


const catchBlockSearch = `            } catch (err) {
                console.error("Error posting note", err);

                // Rollback optimistic UI
                if (noteDiv && noteDiv.parentNode) {
                    noteDiv.remove();
                }
                document.getElementById('shiftNoteContent').value = previousContent;

                if (err.code === 'unavailable' || err.code === 'auth/network-request-failed' || err.code === 'firestore/unavailable') {
                    alert("Network error: Could not connect to the server. Please check your connection.");
                } else {
                    alert(err.message);
                }
            }
        }`;

const catchBlockReplacement = `            } catch (err) {
                console.error("Error posting note", err);

                // Rollback optimistic UI
                if (noteDiv && noteDiv.parentNode) {
                    noteDiv.remove();
                }
                document.getElementById('shiftNoteContent').value = previousContent;

                if (err.code === 'unavailable' || err.code === 'auth/network-request-failed' || err.code === 'firestore/unavailable') {
                    alert("Network error: Could not connect to the server. Please check your connection.");
                } else {
                    alert(err.message);
                }
            } finally {
                if (submitBtn) {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                    if (window.lucide) window.lucide.createIcons();
                }
            }
        }`;

content = content.replace(catchBlockSearch, catchBlockReplacement);

fs.writeFileSync('index.html', content);
