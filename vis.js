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
    let mids = data.map(function(row) {
        let toReturn = {};
        toReturn.name = row['Call Type Group'] + row['Call Type'];
        toReturn.parent = row['Call Type Group'];

        return toReturn;
    });
    // let bottoms = data.map(function(row) {
    //    let toReturn = {};
    //    toReturn.name = row['Call Type Group'] + row['Call Type'] + row['Neighborhood'];
    //    toReturn.parent = row['Call Type Group'] + row['Call Type'];
    //
    //    return toReturn;
    // });

    // Filter to only unique ones
    tops = filterUnique(tops, item => item.name);
    console.log('unique tops', tops);

    mids = filterUnique(mids, item => item.name);
    console.log('unique mids', mids);

    // bottoms = filterUnique(bottoms, item => item.name);
    // console.log('uniquue bottoms', bottoms);

    let allNodes = [...data, ...tops, ...mids, {name:'java', parent:''}];
    console.log('all nodes', allNodes);

    let stratifiedRoot = d3.stratify()
        .id(row => row.name)
        .parentId(row => row.parent)
        (allNodes);
    console.log('root', stratifiedRoot);

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

    // Stuff for stratify
    toReturn.parent = toReturn['Call Type Group'] + toReturn['Call Type'];
    toReturn.name = toReturn['Call Type Group'] + toReturn['Call Type'] + toReturn['Neighborhood'];

    return toReturn;
}

/**
 * My own filter unique function. Unique based on an identifier calculated using func.
 * @param stuff the list of things to filter
 * @param function the function to use to get an identifier.
 */
function filterUnique(stuff, func) {
    let seen_ids = [];

    let newStuff = stuff.filter(function (item) {
        let funcVal = func(item);

        if (! seen_ids.includes(funcVal)) {
            seen_ids.push(funcVal);
            return true;
        } else {
            return false;
        }
    });

    return newStuff;
}

// Let's do this!
prepVis();