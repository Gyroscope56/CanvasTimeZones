chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // For some strange reason, when I try changing the icon based on "currentState" in background.js, everything explodes.
    // So we just chill with what we've got and invert it since the icon is a cycle behind the actual state.
    const usableEnable = !request.enabled;
    sendResponse({ received: true });

    // Now we gotta do the actual stuff.
    // Goal: Find all the timestamps on the page and update them accordingly. First thing to do is to locate all these timestamps.
    // The important timestamps should all follow the format of "DUE: XX:XX AM/PM" or "TODO: XX:XX AM/PM"
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_ELEMENT,
        null,
        false
    );
    let node;

    const days = [];
    while (node = walker.nextNode()) {
        if (node.classList.contains('Day-styles__root')) {
            days.push(node);
        }
    }
    const timezoneMap = {
        'wisc.edu': 'America/Los_Angeles',          // Wisconsin
        'harvard.edu': 'America/New_York',      // Harvard  
        'stanford.edu': 'America/Los_Angeles',  // Stanford
        'mit.edu': 'America/New_York',          // MIT
        'berkeley.edu': 'America/Los_Angeles',  // UC Berkeley
        'washington.edu': 'America/Los_Angeles', // UW
    };

    const timezone = getInstitutionTimezone(window.location.href, timezoneMap);


    // Iterate through all of the day boxes, and for each, we have to translate times
    for (const dayBox of days) {
        const timeStampElements = [];
        const treeWalker2 = document.createTreeWalker(
            dayBox,
            NodeFilter.SHOW_ELEMENT,
            null,
            false
        );
        let node;
        while (node = treeWalker2.nextNode()) {
            const text = node.textContent.toUpperCase();
            const parts = text.split(" ");
            /*
            if (text.includes(":") && (text.includes("AM") || text.includes("PM"))) {
                timeStampElements.push(node);
            }
            */
            if (node.classList.contains("css-1w79pxc-text")) {
                timeStampElements.push(node);
            }
        }
        const treeWalker3 = document.createTreeWalker(
            dayBox,
            NodeFilter.SHOW_ELEMENT,
            null,
            false
        );
        let day;
        while (node = treeWalker3.nextNode()) {
            if (node.classList.contains("Day-styles__secondary")) {
                day = node;
            }
        }
        for (timeStamp of timeStampElements) {
            alterTimeStamp(timeStamp, timezone, day);
            timeStamp.innerHTML = `<span wrap = \"normal\" letter-spacing = \"normal\" class = \"css-1w79pxc-text\"><span aria-hidden = \"true\">${timeStamp.textContent}</span></span>`;
        }
    }
    console.log("___________________");
});


function alterTimeStamp(timeStamp, timeZone, dayInfo) {
    const timeStampWalker = document.createTreeWalker(
        timeStamp,
        NodeFilter.SHOW_ELEMENT,
        null,
        false
    );
    let node;
    let time;
    while (node = timeStampWalker.nextNode()) {
        const text = node.textContent;
        if (text.split(" ").length <= 4) {
            console.log(node);
            // Found something important!
            if (text.includes(":")) {
                // There are text boxes that have "All Day" or "Pts", so we can't parse those for time
                if (text.split(" ").length == 3) {
                    // If this is the case, the format is "DUE: XX:XX PM"
                    time = text.split(" ")[1] + " " + text.split(" ")[2];
                } else {
                    // If this is the case, the format is "TO DO: XX:XX PM"
                    time = text.split(" ")[2] + " " + text.split(" ")[3];
                }
            }
        }
    }
    console.log(time);
    // All the calculations go here
    // Construct the date for the following format: YYYY/MM/DD Hour:Minute:Second +0000"
    const dayParts = dayInfo.textContent.replaceAll(",", "").split(" ");
    let day;
    let month;
    let year = new Date().getFullYear();
    const months = {
        "January": 0,
        "February": 1,
        "March": 2,
        "April": 3,
        "May": 4,
        "June": 5,
        "July": 6,
        "August": 7,
        "September": 8,
        "October": 9,
        "November": 10,
        "December": 11
    }
    if (dayParts.length == 4) {
        // Last year
        year--;
    }
    if (dayParts.length == 2) {
        month = dayParts[0];
        day = dayParts[1];
    } else {
        month = months[dayParts[1]];
        day = dayParts[2];
    }
    let date;
    try {
        date = createDateFromComponents(year, month, day, time, timeZone);
        const tempDate = new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", { timeZone: timeZone }));
        console.log(tempDate);
    } catch (err) { }
    //date = `${new Date().getFullYear()}/${month}/${day} ${timeStamp}:00 +0000`;
    // Now we find day and month

}
function createDateFromComponents(year, month, day, timeString, sourceTimezone) {
    // Parse time string like "2:30 PM"
    const [time, period] = timeString.split(' ');
    const [hours, minutes] = time.split(':').map(num => parseInt(num));

    let hour24 = hours;
    if (period === 'PM' && hours !== 12) {
        hour24 += 12;
    } else if (period === 'AM' && hours === 12) {
        hour24 = 0;
    }

    // Use constructor with individual parameters (most reliable)
    const date = new Date(
        year,
        month,  // Convert to 0-based month
        day,
        hour24,
        minutes || 0,
        0,  // seconds
        0   // milliseconds
    );

    return date;
}

function getInstitutionTimezone(url, timezoneMap) {
    for (const [domain, timezone] of Object.entries(timezoneMap)) {
        if (url.includes(domain)) {
            return timezone;
        }
    }
    return 'America/Los_Angeles'; // Default fallback
}