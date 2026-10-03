const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const search = `            } catch (err) {
                if (window.logManagerError) {
                    window.logManagerError("Error posting note", err);
                } else {
                    console.error("Error posting note", err);
                }

                // Rollback optimistic UI
                if (noteDiv && noteDiv.parentNode) {
                    noteDiv.parentNode.removeChild(noteDiv);
                }

                alert("Failed to post note: " + err.message);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
                    submitBtn.innerHTML = originalBtnText;
                }
            }
        }`;

const replace = `            } catch (err) {
                if (window.logManagerError) {
                    window.logManagerError("Error posting note", err);
                } else {
                    console.error("Error posting note", err);
                }

                // Rollback optimistic UI
                if (noteDiv && noteDiv.parentNode) {
                    noteDiv.parentNode.removeChild(noteDiv);
                }

                // Restore original input content if write fails
                if (typeof previousContent !== 'undefined') {
                    document.getElementById('shiftNoteContent').value = previousContent;
                }

                // Handle network errors gracefully
                if (err.code === 'unavailable' || err.code === 'auth/network-request-failed' || err.code === 'firestore/unavailable') {
                    alert("Network error: Could not connect to the server. Please check your connection.");
                } else {
                    alert("Failed to post note: " + err.message);
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
                    submitBtn.innerHTML = originalBtnText;
                }
            }
        }`;

if (content.includes(search)) {
    content = content.replace(search, replace);
    fs.writeFileSync('index.html', content);
    console.log("Replaced successfully!");
} else {
    console.log("Search string not found!");
}
