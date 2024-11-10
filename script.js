
let participants = {};
let absentees = [];
let presentees = [];
let globalTime = "00:00";
let intervalIds = {};


$(document).ready(function () {

    // Display current date Firday, 23rd Jan 2022
    $('#currentDate').text(new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));

    // Load participants from JSON
    $.getJSON("participants.json", function (data) {
        data.forEach((participant) => {
            // store as key value pair
            participants[participant.id] = {
                id: participant.id,
                name: participant.name,
                dept: participant.dept
            };

        });
    });


    function displayParticipants() {
        const participantDiv = $("#participants");
        participantDiv.empty();

        Object.entries(participants).forEach(([id, participant]) => {

            participantDiv.append(`
                            <div class="participant shadow-sm" id="pt-dv-${participant.id}" data-index="${participant.id}" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; background:#232323">
                                <div>
                                    <h5>${participant.name}</h5>
                                    <p>${participant.dept}</p>
                                    <span id="timer-${participant.id}">${globalTime}</span>
                                </div>
                                <div class="timer-controls" style="display: flex; justify-content: center; align-items: end; gap: 4px;}">
                                    <button onclick="startIndividualTimer(${participant.id})" class="btn btn-sm btn-success">Start</button>
                                    <button onclick="clearInterval(intervalIds[${participant.id}])" class="btn btn-sm btn-danger">Stop</button>
                                    <button onclick="resetTimer(${participant.id})" class="btn btn-sm btn-warning">Reset</button>
                                </div>
                            </div>
                        `);
        });
    }

    // Start all timers with the global time set
    $("#startMeeting").click(function () {
        const inputTime = $("#globalTimer").val();
        if (isValidTimeFormat(inputTime)) {
            displayParticipants();
            globalTime = inputTime;
            Object.entries(participants).forEach(([id, participant]) => {
                $(`#timer-${participant.id}`).text(globalTime);
            });
        } else {
            alert("Please enter a valid time in MM:SS format.");
        }
    });

    // Validate time format MM:SS
    function isValidTimeFormat(time) {
        return /^\d{2}:\d{2}$/.test(time);
    }

    // Save absentees to a JSON file
    $("#saveReport").click(function () {
        absentees = [];
        presentees = [];
        participants = Object.values(participants);
        participants.forEach((participant) => {
            if ($(`#timer-${participant.id}`).text() === globalTime) {
                absentees.push({
                    id: participant.id,
                    name: participant.name,
                    dept: participant.dept
                });
            } else {
                if ($(`#timer-${participant.id}`).text().trim() === "") {
                    return; // Use return instead of continue
                }
                let [minutes, seconds] = $(`#timer-${participant.id}`).text().split(":").map(Number);
                let totalSeconds = minutes * 60 + seconds;

                let [globalMinutes, globalSeconds] = globalTime.split(":").map(Number);
                let globalTotalSeconds = globalMinutes * 60 + globalSeconds;

                let time_spent = globalTotalSeconds - totalSeconds;
                minutes = Math.floor(time_spent / 60);
                seconds = time_spent % 60;

                console.log(time_spent);
                presentees.push({
                    id: participant.id,
                    name: participant.name,
                    dept: participant.dept,
                    time: minutes + ' min ' + seconds + ' sec'
                });
            }
        });

        downloadReport();
    });


});

// Start individual timer
function startIndividualTimer(index) {
    if (intervalIds[index]) {
        clearInterval(intervalIds[index]);
    }

    const [minutes, seconds] = $(`#timer-${index}`).text().split(":").map(Number);
    let totalSeconds = minutes * 60 + seconds;

    intervalIds[index] = setInterval(() => {
        if (totalSeconds <= 0) {
            clearInterval(intervalIds[index]);
            $(`#timer-${index}`).text("00:00");
            return;
        }
        totalSeconds--;
        //  add bg color from left to right color light blue
        $(`#pt-dv-${index}`).css("background", `linear-gradient(to right, #0c5e09 ${100 - (totalSeconds / (minutes * 60 + seconds)) * 100}%, #232323 0%)`);

        const displayMinutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
        const displaySeconds = String(totalSeconds % 60).padStart(2, "0");
        $(`#timer-${index}`).text(`${displayMinutes}:${displaySeconds}`);
    }, 1000);

    absentees = absentees.filter(id => id !== index);
}

// Reset timer to global time
function resetTimer(index) {
    clearInterval(intervalIds[index]);
    $(`#timer-${index}`).text(globalTime);
    $(`#pt-dv-${index}`).css("background", "none");
}

function downloadReport() {
    if (!absentees.length && !presentees.length) {
        alert("No data to save. Please start the meeting and try again.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Get the current date for the header and file name
    const today = new Date();
    // Format as 23-Jan-2022
    const dateStr = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ /g, '-');


    // Main heading
    doc.setFontSize(18);
    doc.text("ImpactFuse Scrum", 105, 15, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Report Date: ${dateStr}`, 105, 23, { align: "center" });

    // Section heading for Absentees
    doc.setFontSize(16);
    doc.text("Absent", 10, 35);

    // Table for Absentees
    doc.autoTable({
        startY: 40,
        head: [['SL', 'Name', 'Department']],
        body: absentees.map(participant => [participant.id, participant.name, participant.dept]),
        theme: 'grid',
        styles: { halign: 'center' },
        headStyles: { fillColor: [245, 35, 24] }, // red
    });

    // Section heading for Presentees
    const presenteesStartY = doc.previousAutoTable.finalY + 10; // Start below the last table
    doc.setFontSize(16);
    doc.text("Present", 10, presenteesStartY);

    // Table for Presentees
    doc.autoTable({
        startY: presenteesStartY + 5,
        head: [['SL', 'Name', 'Department', `Speech Time (${globalTime} min)`]],
        body: presentees.map(participant => [participant.id, participant.name, participant.dept, participant.time]),
        theme: 'grid',
        styles: { halign: 'center' },
        headStyles: { fillColor: [28, 201, 22] }, // green
    });

    // Save the PDF with the formatted filename
    doc.save(`scrum-report-${dateStr}.pdf`);
}

