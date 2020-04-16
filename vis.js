/**
 * Prepare things, load the data, then draw the visualization
 */
function prepVis() {


    // TODO prepare things, set up



    // Load the data, then draw the visualization!
    let csv = d3.csv('resources/Fire_Department_Calls_for_Service.csv', convertRow)
        .then(drawVis);
}

/**
 * Once the data has been loaded, draw the visualization.
 * @param data the data to display.
 */
function drawVis(data) {

    // Make a hierarchy out of the data
    console.log('plain data', data);

    // Add extra mid-level nodes
    let tops = data.map(function(row) {
        let toReturn = {};
        toReturn.name = row['Call Type Group'];
        toReturn.parent = 'java';

        return toReturn;
    });

    // Filter to only unique ones
// TODO use filterUnique

    let mids = new Set(data.map(function(row) {
        let toReturn = {};
        toReturn.name = row['Call Type'];
        toReturn.parent = row['Call Type Group'];

        return toReturn;
    }));
    console.log('mids', mids);

    // let allNodes = data

    let stratifiedRoot = d3.stratify()
        .id(row => row.name)

    // TODO draw something visual-ish
}

/**
 * Convert a row when loading the data from csv.
 * @param row the raw row to deal with
 * @returns the row, converted
 */
function convertRow(row) {
    let toReturn = {};
    toReturn['Call Type Group'] = row['Call Type Group'];
    toReturn['Call Type'] = row['Call Type'];
    toReturn['Neighborhood'] = row['Neighborhooods - Analysis Boundaries'];

    // TODO Remove apostrophes?
    // toReturn['Neighborhood'] = row['Neighborhooods - Analysis Boundaries'].replace(/'/g, '');

    toReturn['Incident Count'] = row['Incident Number'];

    toReturn.name = toReturn['Call Type'] + toReturn['Call Type Group'] + toReturn['Neighborhood'];

    return toReturn;
}

/**
 * My own filter unique function.
 * @param item the list of things to filter
 * @param function the function to use to get an identifier.
 */
function filterUnique(item, func) {
    let seen_ids = [];

    tops = tops.filter(function (item) {
        if (! seen_ids.includes(item.name)) {
            seen_ids.push(item.name);
            return true;
        } else {
            return false;
        }
    });
    console.log('tops', tops);
}

// Let's do this!
prepVis();