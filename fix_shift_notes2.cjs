const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const searchBlock = `            } catch (err) {
                console.error("Error posting note", err);

                // Rollback optimistic UI
                if (noteDiv && noteDiv.parentNode) {
                    noteDiv.remove();
                }
                document.getElementById('shiftNoteContent').value = previousContent;

                if (err.code === 'unavailable' || err.code === 'auth/network-request-failed' || err.code === 'firestore/unavailable') {
                    alert("Network error: Could not connect to the server. Please check your connection or whitelist the domain.");
                } else {
                    alert("Failed to post note: " + err.message);
                }
            }
        }`;

const replacementBlock = `            } catch (err) {
                console.error("Error posting note", err);

                // Rollback optimistic UI
                if (noteDiv && noteDiv.parentNode) {
                    noteDiv.remove();
                }
                document.getElementById('shiftNoteContent').value = previousContent;

                if (err.code === 'unavailable' || err.code === 'auth/network-request-failed' || err.code === 'firestore/unavailable') {
                    alert("Network error: Could not connect to the server. Please check your connection or whitelist the domain.");
                } else {
                    alert("Failed to post note: " + err.message);
                }
            } finally {
                if (submitBtn) {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                    if (window.lucide) window.lucide.createIcons();
                }
            }
        }`;

content = content.replace(searchBlock, replacementBlock);
fs.writeFileSync('index.html', content);
