const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

// I will just add disabled:opacity-70 disabled:cursor-not-allowed to the button as well

const searchBtn = '<button onclick="submitShiftNote()" class="btn btn-primary px-8 py-3">Post Note</button>';
const replaceBtn = '<button id="btnSubmitShiftNote" onclick="submitShiftNote()" class="btn btn-primary px-8 py-3 disabled:opacity-70 disabled:cursor-not-allowed">Post Note</button>';

content = content.replace(searchBtn, replaceBtn);

const searchFetch = "const submitBtn = document.querySelector('#view-shiftNotes button[onclick=\"submitShiftNote()\"]');";
const replaceFetch = "const submitBtn = document.getElementById('btnSubmitShiftNote');";

content = content.replace(searchFetch, replaceFetch);

fs.writeFileSync('index.html', content);
