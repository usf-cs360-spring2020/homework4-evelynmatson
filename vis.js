let svg;
let colorScale;
let numberFormat;

/**
 * Prepare things, load the data, then draw the visualization
 */
function prepVis() {


    // TODO prepare things, set up
    svg = d3.select('svg#vis_svg');
    numberFormat = d3.format(".2~s");



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
        toReturn.parent = 'top';

        toReturn['Incident Count'] = 0;

        return toReturn;
    });
    let mids = data.map(function(row) {
        let toReturn = {};
        toReturn.name = row['Call Type Group'] + row['Call Type'];
        toReturn.parent = row['Call Type Group'];

        toReturn['Incident Count'] = 0;

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

    let allNodes = [...data, ...tops, ...mids, {name:'top', parent:''}];
    // let allNodes = [...tops, ...mids, {name:'top', parent:''}];
    console.log('all nodes', allNodes);

    // Make the hierarchy
    let stratifiedRoot = d3.stratify()
        .id(row => row.name)
        .parentId(row => row.parent)
        (allNodes);
    console.log('root', stratifiedRoot);

    // Calculate some values
    stratifiedRoot.sum(row => row['Incident Count']);
    stratifiedRoot.each(function(node) {
        node.totalCount = node.value;
    });
    console.log('root with calculations', stratifiedRoot);

    //  Actually draw something
    colorScale = d3.scaleSequential([stratifiedRoot.height, 0], d3.interpolateViridis);

    let module = stratifiedRoot.copy();
    let pad = 0;
    let diam = 400;
    let layout = d3.tree().size([2*Math.PI, (diam/2) - pad]);
    layout(module);

    module.each(function(node) {
        node.theta = node.x;
        node.radial = node.y;

        let point = toCartesian(node.radial, node.theta);
        node.x = point.x;
        node.y = point.y;
    });

    let width = 400;
    let height = 400;
    let plot = svg.append('g')
        .attr('id', 'plot1')
        .attr('transform', translate(width / 2, height / 2));

    drawLinks(plot.append('g'), module.links(), straightLine);
    drawNodes(plot.append('g'), module.descendants(), true);
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

    // Prevent call type group being ''
    if (toReturn['Call Type Group'] == '') {
        toReturn['Call Type Group'] = 'other';
    }


    toReturn['Incident Count'] = row['Incident Number'];

    // Stuff for stratify
    toReturn.parent = toReturn['Call Type Group'] + toReturn['Call Type'];
    toReturn.name = toReturn['Call Type Group'] + toReturn['Call Type'] + toReturn['Neighborhood'];

    return toReturn;
}





// MY HELPERS
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




// SOPHIE'S HELPERS
// Sophie's straight line generator
let straightlinehelper = d3.line()
        .curve(d3.curveLinear)
        .x(d => d['x'])
        .y(d => d['y']);
let straightLine = function(node) {
    return straightlinehelper([node.source, node.target]);
};

/**
 * Sophie's helpful translate method.
 * @param x horizontal amount to translate
 * @param y vertical amount to translate
 * @returns {string} a string to be used for translating
 */
function translate(x, y) {
    return 'translate(' + String(x) + ',' + String(y) + ')';
}

/**
 * Sophie's helpful polar/cartesian converter
 * @param r the radial value
 * @param theta the angle
 * @returns {{x: number, y: number}}
 */
function toCartesian(r, theta) {
    return {
        x: r * Math.cos(theta),
        y: r * Math.sin(theta)
    };
}

/**
 * Sophie's helpful drawlinks method
 * @param g where to draw them
 * @param links the links to draw
 * @param generator the generator to use
 */
function drawLinks(g, links, generator) {
    let paths = g.selectAll('path')
        .data(links)
        .enter()
        .append('path')
        .attr('d', generator)
        .attr('class', 'link');
}

/**
 * Sophie's helpful drawnodes method
 * @param g where to draw them
 * @param nodes the nodes to use
 * @param raise whether to raise them up
 */
function drawNodes(g, nodes, raise) {
    let r = 5;

    let circles = g.selectAll('circle')
        .data(nodes, node => node.data.name)
        .enter()
        .append('circle')
        .attr('r', d => d.r ? d.r : r)
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('id', d => d.data.name)
        .attr('class', 'node')
        .style('fill', d => colorScale(d.depth));

    setupEvents(g, circles, raise);
}

/**
 * Sophie's helpful setup events method
 * @param g where to draw
 * @param selection the selected element
 * @param raise whether to raise them
 */
function setupEvents(g, selection, raise) {
    selection.on('mouseover.highlight', function(d) {
        // https://github.com/d3/d3-hierarchy#node_path
        // returns path from d3.select(this) node to selection.data()[0] root node
        let path = d3.select(this).datum().path(selection.data()[0]);

        // select all of the nodes on the shortest path
        let update = selection.data(path, node => node.data.name);

        // highlight the selected nodes
        update.classed('selected', true);

        if (raise) {
            update.raise();
        }
    });

    selection.on('mouseout.highlight', function(d) {
        let path = d3.select(this).datum().path(selection.data()[0]);
        let update = selection.data(path, node => node.data.name);
        update.classed('selected', false);
    });

    // show tooltip text on mouseover (hover)
    selection.on('mouseover.tooltip', function(d) {
        showTooltip(g, d3.select(this));
    });

    // remove tooltip text on mouseout
    selection.on('mouseout.tooltip', function(d) {
        g.select("#tooltip").remove();
    });
}

/**
 * Sophie's helpful showtooltip method
 * @param g where to put new elements in the DOM
 * @param node the node to show the tooltip about
 */
function showTooltip(g, node) {
    let gbox = g.node().getBBox();     // get bounding box of group BEFORE adding text
    let nbox = node.node().getBBox();  // get bounding box of node

    // calculate shift amount
    let dx = nbox.width / 2;
    let dy = nbox.height / 2;

    // retrieve node attributes (calculate middle point)
    let x = nbox.x + dx;
    let y = nbox.y + dy;

    // get data for node
    let datum = node.datum();

    // remove "java.base." from the node name
    let name = datum.data.name.replace("java\.base\.", "");

    // use node name and total size as tooltip text
    let text = `${name} (${numberFormat(datum.data.total)}, ${numberFormat(datum.data.leaves)}n)`;

    // create tooltip
    let tooltip = g.append('text')
        .text(text)
        .attr('x', x)
        .attr('y', y)
        .attr('dy', -dy - 4) // shift upward above circle
        .attr('text-anchor', 'middle') // anchor in the middle
        .attr('id', 'tooltip');

    // it is possible the tooltip will fall off the edge of the
    // plot area. we can detect when this happens, and set the
    // text anchor appropriately

    // get bounding box for the text
    let tbox = tooltip.node().getBBox();

    // if text will fall off left side, anchor at start
    if (tbox.x < gbox.x) {
        tooltip.attr('text-anchor', 'start');
        tooltip.attr('dx', -dx); // nudge text over from center
    }
    // if text will fall off right side, anchor at end
    else if ((tbox.x + tbox.width) > (gbox.x + gbox.width)) {
        tooltip.attr('text-anchor', 'end');
        tooltip.attr('dx', dx);
    }

    // if text will fall off top side, place below circle instead
    if (tbox.y < gbox.y) {
        tooltip.attr('dy', dy + tbox.height);
    }
}

// Let's do this!
prepVis();