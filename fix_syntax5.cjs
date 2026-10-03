const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const search = `              async function deleteAnnouncement(id) {
                  if (!confirm('Are you sure you want to delete this announcement?')) return;
                  try {
                      await window.db.collection('announcements').doc(id).delete();
                  } catch (error) {
                      window.logManagerError("Error deleting announcement", error);
                      alert("Failed to delete announcement.");
                  }
              }`;
const replace = ``;

if (html.includes(search)) {
    // Only replace the last occurrence to remove the duplicate
    const lastIndex = html.lastIndexOf(search);
    if(lastIndex > -1) {
        html = html.substring(0, lastIndex) + replace + html.substring(lastIndex + search.length);
        fs.writeFileSync('index.html', html);
        console.log("Replaced successfully!");
    }
} else {
    console.log("Search string not found!");
}
