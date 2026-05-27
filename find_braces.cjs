const fs = require('fs');

const content = fs.readFileSync('src/legacy/pages/puzzle/inline.js', 'utf8');
const lines = content.split('\n');

let depth = 0;
let stack = [];
let inString = false;
let stringChar = '';
let inComment = false;
let inBlockComment = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const nextChar = line[j + 1];

        if (inBlockComment) {
            if (char === '*' && nextChar === '/') {
                inBlockComment = false;
                j++;
            }
            continue;
        }

        if (inComment) {
            break; 
        }

        if (inString) {
            if (char === '\\\\') {
                j++; // Skip next char
                continue;
            }
            if (char === stringChar) {
                inString = false;
            }
            continue;
        }

        if (char === '/' && nextChar === '/') {
            inComment = true;
            break;
        }

        if (char === '/' && nextChar === '*') {
            inBlockComment = true;
            j++;
            continue;
        }

        if (char === "'" || char === '"' || char === '`') {
            inString = true;
            stringChar = char;
            continue;
        }

        if (char === '{') {
            depth++;
            stack.push({ line: i + 1, col: j + 1 });
        } else if (char === '}') {
            const opened = stack.pop();
            depth--;
            if (i + 1 === 2277) {
                console.log(`Brace at line 2277 matched brace opened at line ${opened.line}, col ${opened.col}`);
            }
        }
    }
    inComment = false;
}

console.log(`Final depth: ${depth}`);
console.log(`Unclosed braces opened at:`, stack);
