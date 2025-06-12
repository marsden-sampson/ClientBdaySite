// CONFIG — your live Google Sheet CSV link:
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSTyofqA-oB1PQ_zFGGyyEVpGzd1SM0kymh2EmvNjg9YigSqavGSf4ygIbeBkDgG6tTz4TOvg0jrw8F/pub?gid=954985025&single=true&output=csv';

// Helper to get today's date (MM-DD format)
function getTodayMMDD() {
    const today = new Date();
    let mm = today.getMonth() + 1;
    let dd = today.getDate();
    if (mm < 10) mm = '0' + mm;
    if (dd < 10) dd = '0' + dd;
    return `${mm}-${dd}`;
}

// Helper to get current month (number)
function getCurrentMonth() {
    const today = new Date();
    return today.getMonth() + 1;
}

// Proper CSV parsing function to handle quoted fields
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Handle escaped quotes
                current += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    // Add the last field
    result.push(current);

    return result;
}

// Main function
function loadBirthdays() {
    console.log('Attempting to load birthdays from:', SHEET_URL);

    fetch(SHEET_URL)
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(csv => {
            console.log('CSV data received, length:', csv.length);
            console.log('First 200 characters:', csv.substring(0, 200));

            const lines = csv.trim().split('\n');
            if (lines.length < 2) {
                throw new Error('No data found in spreadsheet');
            }

            // Parse CSV headers and trim whitespace including carriage returns
            const headers = parseCSVLine(lines[0]).map(header => header.replace(/\r/g, '').trim());
            console.log('Parsed headers:', headers);

            if (!headers) {
                throw new Error('Invalid CSV format');
            }

            const nameIndex = headers.indexOf('Name');
            const bdayIndex = headers.indexOf('Birthday');

            console.log('Name column index:', nameIndex);
            console.log('Birthday column index:', bdayIndex);

            if (nameIndex === -1 || bdayIndex === -1) {
                throw new Error(`Required columns not found. Available columns: ${headers.join(', ')}`);
            }

            const todayMMDD = getTodayMMDD();
            const currentMonth = getCurrentMonth();

            let todayBirthdays = [];
            let monthBirthdays = [];

            for (let i = 1; i < lines.length; i++) {
                const row = parseCSVLine(lines[i]);
                if (!row || row.length <= Math.max(nameIndex, bdayIndex)) continue;

                const name = row[nameIndex].trim();
                const bday = row[bdayIndex].trim();

                if (!name || !bday) continue;

                const parts = bday.split('-');
                if (parts.length < 3) continue; // skip bad rows

                // Use compatible padding method for older browsers
                const month = parts[1].length === 1 ? '0' + parts[1] : parts[1];
                const day = parts[2].length === 1 ? '0' + parts[2] : parts[2];
                const mmdd = `${month}-${day}`;
                const monthNum = parseInt(parts[1]);

                // Check for today
                if (mmdd === todayMMDD) {
                    todayBirthdays.push(name);
                }

                // Collect for month view
                if (monthNum === currentMonth) {
                    monthBirthdays.push({ name, day: parseInt(parts[2]) });
                }
            }

            displayBirthdays(todayBirthdays, monthBirthdays);
        })
        .catch(error => {
            console.error('Detailed error loading birthdays:', error.message);
            console.error('Full error object:', error);
            handleError(error);
        });
}

// Display birthdays function
function displayBirthdays(todayBirthdays, monthBirthdays) {
    const title = document.getElementById('title');
    const list = document.getElementById('birthday-list');

    if (todayBirthdays.length > 0) {
        // Today's birthdays!
        title.textContent = 'Happy Birthday!';
        title.style.color = '#e63946';
        list.innerHTML = '';

        todayBirthdays.forEach((name, index) => {
            const div = document.createElement('div');
            div.textContent = name;

            // Calculate font size based on number of people
            let fontSizeMultiplier = 2;
            if (todayBirthdays.length === 2) {
                fontSizeMultiplier = 1.99; // 10% smaller
            } else if (todayBirthdays.length >= 3) {
                fontSizeMultiplier = 1.99; // 20% smaller
            }

            // Dynamic font size based on name length
            let baseFontSize = 2.8;
            if (name.length > 10) {
                baseFontSize = 2.2;
            }
            if (name.length > 15) {
                baseFontSize = 1.8;
            }

            // Apply the multiplier based on number of people
            const finalFontSize = baseFontSize * fontSizeMultiplier;
            div.style.fontSize = `${finalFontSize}rem`;
            div.style.animationDelay = `${index * 0.3}s`;
            div.classList.add('birthday-name', 'animate__animated', 'animate__bounceIn');
            list.appendChild(div);
        });

        // Trigger confetti 🎊
        launchConfetti();

    } else {
        // This month's birthdays
        const monthName = new Date().toLocaleString('default', { month: 'long' });
        title.textContent = `${monthName} Birthdays`;
        title.style.color = '#00b4d8';

        // Sort by day
        monthBirthdays.sort((a, b) => a.day - b.day);

        list.innerHTML = '';

        if (monthBirthdays.length === 0) {
            const div = document.createElement('div');
            div.textContent = 'No birthdays this month!';
            div.style.fontStyle = 'italic';
            div.style.opacity = '0.7';
            list.appendChild(div);
        } else {
            // Create grid for monthly birthdays - use 3 columns if more than 12 birthdays
            const gridContainer = document.createElement('div');
            gridContainer.classList.add('birthday-grid');
            
            const useThreeColumns = monthBirthdays.length > 12;
            if (useThreeColumns) {
                gridContainer.classList.add('three-columns');
            }
            
            // Add special class for more than 18 birthdays
            if (monthBirthdays.length > 18) {
                gridContainer.classList.add('many-birthdays');
            }

            const leftColumn = document.createElement('div');
            leftColumn.classList.add('birthday-column');

            const middleColumn = document.createElement('div');
            middleColumn.classList.add('birthday-column');

            const rightColumn = document.createElement('div');
            rightColumn.classList.add('birthday-column');

            // Calculate distribution points
            let firstSplit, secondSplit;
            if (useThreeColumns) {
                firstSplit = Math.ceil(monthBirthdays.length / 3);
                secondSplit = Math.ceil((monthBirthdays.length * 2) / 3);
            } else {
                firstSplit = Math.ceil(monthBirthdays.length / 2);
                secondSplit = monthBirthdays.length; // All remaining go to second column
            }

            monthBirthdays.forEach((entry, index) => {
                const div = document.createElement('div');

                // Add ordinal suffix to day
                const dayWithSuffix = addOrdinalSuffix(entry.day);
                div.textContent = `${entry.name} — ${dayWithSuffix}`;

                div.style.animationDelay = `${index * 0.1}s`;
                div.classList.add('birthday-name', 'monthly', 'animate__animated', 'animate__fadeInUp');

                // Reduce font size by 10% if more than 18 birthdays
                if (monthBirthdays.length > 18) {
                    div.style.fontSize = '2.3rem'; // 2.8rem * 0.9 = 2.52rem
                }

                // Distribute across columns
                if (index < firstSplit) {
                    leftColumn.appendChild(div);
                } else if (useThreeColumns && index < secondSplit) {
                    middleColumn.appendChild(div);
                } else {
                    rightColumn.appendChild(div);
                }
            });

            gridContainer.appendChild(leftColumn);
            if (useThreeColumns) {
                gridContainer.appendChild(middleColumn);
            }
            gridContainer.appendChild(rightColumn);
            list.appendChild(gridContainer);

            // Add confetti for monthly birthdays too
            launchMonthlyConfetti();
        }
    }
}

// Add ordinal suffix to numbers (1st, 2nd, 3rd, etc.)
function addOrdinalSuffix(day) {
    if (day >= 11 && day <= 13) {
        return day + 'th';
    }
    switch (day % 10) {
        case 1: return day + 'st';
        case 2: return day + 'nd';
        case 3: return day + 'rd';
        default: return day + 'th';
    }
}

// Error handling function
function handleError(error) {
    const title = document.getElementById('title');
    const list = document.getElementById('birthday-list');

    title.textContent = 'Unable to Load Birthdays';
    title.style.color = '#ff6b6b';

    list.innerHTML = '';
    const errorDiv = document.createElement('div');

    // Show more specific error information
    if (error.message.includes('HTTP error')) {
        errorDiv.textContent = 'Cannot access Google Sheet. Please check the sharing settings.';
    } else if (error.message.includes('Required columns')) {
        errorDiv.textContent = `Spreadsheet format error: ${error.message}`;
    } else if (error.message.includes('No data found')) {
        errorDiv.textContent = 'The spreadsheet appears to be empty.';
    } else {
        errorDiv.textContent = `Error: ${error.message}`;
    }

    errorDiv.style.fontSize = '1.5rem';
    errorDiv.style.opacity = '0.7';
    errorDiv.style.fontStyle = 'italic';
    list.appendChild(errorDiv);

    // Add debug info
    const debugDiv = document.createElement('div');
    debugDiv.textContent = 'Check browser console for detailed error information.';
    debugDiv.style.fontSize = '1rem';
    debugDiv.style.opacity = '0.5';
    debugDiv.style.marginTop = '20px';
    list.appendChild(debugDiv);

    // Retry after 30 seconds
    setTimeout(() => {
        loadBirthdays();
    }, 30000);
}

// Enhanced confetti launcher for today's birthdays
function launchConfetti() {
    const duration = 5 * 1000;
    const end = Date.now() + duration;

    // Initial burst
    confetti({
        particleCount: 250,
        spread: 110,
        origin: { y: 0.6 }
    });

    // Continuous confetti
    (function frame() {
        confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.8 },
            colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7']
        });
        confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.8 },
            colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7']
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    })();
}

// Confetti for monthly birthdays
function launchMonthlyConfetti() {
    // Gentler confetti for monthly view
    confetti({
        particleCount: 250,
        spread: 100,
        origin: { y: 0.7 },
        colors: ['#00b4d8', '#4ecdc4', '#45b7d1', '#96ceb4', '#a8e6cf']
    });
}

// Continuous background confetti
function startContinuousConfetti() {
    function dropConfetti() {
        confetti({
            particleCount: 150,
            spread: 360,
            ticks: 50,
            gravity: 0.3,
            decay: 0.94,
            startVelocity: 15,
            origin: {
                x: Math.random(),
                y: -0.1
            },
            colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#ff8c00', '#9932cc', '#32cd32']
        });
    }

    // Drop confetti every 500ms
    setInterval(dropConfetti, 500);
}

// First load:
loadBirthdays();

// Start continuous confetti
startContinuousConfetti();

// Auto refresh every 5 min (300000 ms)
setInterval(loadBirthdays, 30000);