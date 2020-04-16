/**
 * Prepare things, load the data, then draw the visualization
 */
function prepVis() {
    let csv = d3.csv('resources/Fire_Department_Calls_for_Service.csv', convertRow);
}

/**
 * Once the data has been loaded, draw the visualization.
 * @param data the data to display.
 */
function drawVis(data) {
    console.log(data);
}

/**
 * Convert a row when loading the data from csv.
 * @param row the raw row to deal with
 * @returns the row, converted
 */
function convertRow(row) {
    return row;
}


// Let's do this!
prepVis();