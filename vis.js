let node_svg;
let sunburst_svg;
let node_link_colorScale;
let sunburst_colorScale;
let numberFormat;
let straightLine;
// let node_link_current_node_name;
// let current_node_link_depth = 0;

let sunburst_params = {
    current_name : '',
    current_depth : 0
};
let node_link_params = {
    current_name : '',
    current_depth : 0
};
// let sunburst_current_node_name;
// let current_sunburst_depth = 0;

let the_data;
let stratifiedRoot;
let areas = {
    "Bayview Hunters Point": 3.2995929824653775e-7,
    "Bernal Heights": 6.875398811363375e-8,
    "Castro/Upper Market": 5.467377810271634e-8,
    "Chinatown": 1.4328101706653532e-8,
    "Excelsior": 8.879836159873052e-8,
    "Financial District/South Beach": 7.16735986762e-8,
    "Glen Park": 4.263538327607805e-8,
    "Inner Richmond": 4.74582944562078e-8,
    "Golden Gate Park": 1.0999858631581153e-7,
    "Haight Ashbury": 3.551011586744631e-8,
    "Hayes Valley": 3.1278719462983985e-8,
    "Inner Sunset": 9.080600839652135e-8,
    "Japantown": 7.69778443906668e-9,
    "McLaren Park": 3.927075589055826e-8,
    "Tenderloin": 2.505432950059881e-8,
    "Lakeshore": 1.8374105323758786e-7,
    "Lincoln Park": 2.517847096353071e-8,
    "Lone Mountain/USF": 3.694715924357162e-8,
    "Marina": 6.526350472791586e-8,
    "Russian Hill": 3.150833559427748e-8,
    "Mission": 1.201409076538265e-7,
    "Mission Bay": 5.185902532631335e-8,
    "Nob Hill": 2.5949314394737673e-8,
    "Seacliff": 1.3580112025879003e-8,
    "Noe Valley": 6.226161455047963e-8,
    "North Beach": 3.184709888250734e-8,
    "Oceanview/Merced/Ingleside": 6.71831061251291e-8,
    "South of Market": 5.644669178207152e-8,
    "Sunset/Parkside": 2.697054607256303e-7,
    "Outer Mission": 6.40490584446199e-8,
    "Outer Richmond": 1.1421838101575966e-7,
    "Pacific Heights": 5.072141065513779e-8,
    "Portola": 5.266964060618371e-8,
    "Potrero Hill": 7.253899004267683e-8,
    "Presidio": 1.507806890640558e-7,
    "Presidio Heights": 3.203887214813108e-8,
    "Treasure Island": 5.669422061628886e-8,
    "Twin Peaks": 4.22664974295642e-8,
    "Visitacion Valley": 3.902341416904362e-8,
    "West of Twin Peaks": 1.9507723566688656e-7,
    "Western Addition": 3.721143938964292e-8
};
// Calculated using d3.geoArea and resources/Analysis Neighborhoods.geojson



/**
 * Prepare things, load the data, then draw the visualization
 */
function prepVis() {


    // TODO prepare things, set up
    node_svg = d3.select('svg#node_link_vis_svg');
    sunburst_svg = d3.select('svg#sunburst_vis_svg');
    numberFormat = d3.format(".2~s");

    // Sophie's straight line generator
    let straightlinehelper = d3.line()
        .curve(d3.curveLinear)
        .x(d => d['x'])
        .y(d => d['y']);
    straightLine = function(node) {
        return straightlinehelper([node.source, node.target]);
    };

    // Start visualizing all nodes to begin with
    node_link_params.current_name = 'All Incidents';
    sunburst_params.current_name = 'All Incidents';

    // Load the data, then draw the visualization!
    let csv = d3.csv('resources/Fire_Department_Calls_for_Service.csv', convertRow)
        .then(wrangle);
}

/**
 * Once the data has been loaded, wrangle it into a hierarchical form.
 * @param data the data to wrangle.
 */
function wrangle(data) {
    the_data = data;

    // Make a hierarchy out of the data
    // console.log('plain data', data);

    // Add extra mid-level nodes
    let tops = data.map(function(row) {
        let toReturn = {};
        toReturn.name = row['Call Type Group'];
        toReturn.parent = 'All Incidents';

        toReturn['Incident Count'] = 0;

        return toReturn;
    });
    let mids = data.map(function(row) {
        let toReturn = {};
        toReturn.name = row['Call Type Group'] + ':' + row['Call Type'];
        toReturn.parent = row['Call Type Group'];

        toReturn['Incident Count'] = 0;

        return toReturn;
    });

    // Filter to only unique ones
    tops = filterUnique(tops, item => item.name);
    // console.log('unique tops', tops);

    mids = filterUnique(mids, item => item.name);
    // console.log('unique mids', mids);

    let allNodes = [...data, ...tops, ...mids, {name:'All Incidents', parent:''}];
    console.log('all nodes', allNodes);

    // Make the hierarchy
    stratifiedRoot = d3.stratify()
        .id(row => row.name)
        .parentId(row => row.parent)
        (allNodes);
    console.log('root', stratifiedRoot);

    // Calculate some values (total counts)
    stratifiedRoot.sum(row => row['Incident Count']);
    stratifiedRoot.each(function(node) {
        node.data.totalCount = node.value;
    });
    console.log('root with calculations', stratifiedRoot);

    // Prep the color scales
    node_link_colorScale = d3.scaleSequential( d3.interpolateViridis)
        .domain([stratifiedRoot.height, 0]);
    sunburst_colorScale = d3.scaleSequential( d3.interpolateViridis)
        .domain([stratifiedRoot.height, 0]);

    // Sort sort sort

    stratifiedRoot.sort(function(a, b) {
        return b.height - a.height || b.data.totalCount - a.data.totalCount;
    });
    console.log('root before sort', stratifiedRoot);

    drawNodeLinkVis();
    drawSunburst();
}

/**
 * Draw the Node Link Visualization, after the data is prepared
 */
function drawNodeLinkVis() {

    // Find the selected node to draw
    let selectedRoot = null;
    stratifiedRoot.each(function(node) {
        if (node.data.name == node_link_params.current_name) {
            selectedRoot = node;
        }
    });

    //  Actually draw node link
    let module = selectedRoot.copy();
    let pad = 0;
    let diam = 550;
    let layout = d3.tree().size([2*Math.PI, (diam/2) - pad]);
    layout(module);

    module.each(function(node) {
        node.theta = node.x;
        node.radial = node.y;

        let point = toCartesian(node.radial, node.theta);
        node.x = point.x;
        node.y = point.y;
    });

    let width = 900;
    let height = 600;
    node_svg.selectAll('g').remove();
    let plot = node_svg.append('g')
        .attr('id', 'plot1')
        .attr('transform', translate(width / 2, height / 2));

    drawLinks(plot.append('g').attr('id', 'links'), module.links(), straightLine);
    drawNodes(plot.append('g').attr('id', 'nodes'), module.descendants(), true);
}

/**
 * Draw the sunburst visualization after the data has been loaded.
 */
function drawSunburst() {

    // Find the selected node to draw
    let selectedRoot = null;
    stratifiedRoot.each(function(node) {
        if (node.data.name == sunburst_params.current_name) {
            selectedRoot = node;
        }
    });
    let root = selectedRoot.copy();

    let pad = 0;
    let diam = 550;
    let width = 900;
    let height = 600;
    let layout = d3.partition().size([width - 2 * pad, height - 2 * pad]);
    layout(root);

    sunburst_svg.selectAll('g').remove();
    let plot = sunburst_svg.append('g')
        .attr('id', 'plot')
        .attr('transform', translate(pad, pad));

    let rects = plot.selectAll('rect')
        .data(root.descendants())
        .enter()
        .append('rect')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => d.y1 - d.y0)
        .attr('id', d => d.data.name)
        .attr('class', 'rect')
        .style('fill', d => sunburst_colorScale(d.depth + sunburst_params.current_depth));

    setupEvents(plot, rects, true, sunburst_params);
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
    toReturn['Area'] = areas[toReturn['Neighborhood']];

    // TODO Remove apostrophes?
    // toReturn['Neighborhood'] = row['Neighborhooods - Analysis Boundaries'].replace(/'/g, '');

    // Prevent call type group being ''
    if (toReturn['Call Type Group'] == '') {
        toReturn['Call Type Group'] = 'other';
    }


    toReturn['Incident Count'] = row['Incident Number'];

    // Stuff for stratify
    toReturn.parent = toReturn['Call Type Group'] + ':' + toReturn['Call Type'];
    toReturn.name = toReturn['Call Type Group'] + ':' + toReturn['Call Type'] + ' - ' + toReturn['Neighborhood'];

    return toReturn;
}



// SOPHIE'S HELPERS
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
        .style('fill', d => node_link_colorScale(d.depth + node_link_params.current_depth));

    setupEvents(g, circles, raise, node_link_params);
}

/**
 * Sophie's helpful setup events method
 * @param g where to draw
 * @param selection the selected element
 * @param raise whether to raise them
 * @param params the current name and current depth to use
 */
function setupEvents(g, selection, raise, params) {
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

    selection.on('click.zoom', function(d) {
        let this_node_maybe = d3.select(this).datum().data;
        // console.log('this node maybe', this_node_maybe);
        // console.log('this node datum', d3.select(this).datum());
        // console.log('down...');

        // Update the current node name
        params.current_name = this_node_maybe.name;
        console.log('set current_node_name to', params.current_name);

        // Update the current depth
        params.current_depth += d3.select(this).datum().depth;
        console.log('set current depth to', params.current_depth);

        drawSunburst();
        drawNodeLinkVis();
    });

    // console.log('selection', selection);
    // let selectedSelection = d3.select(selection['_groups'][0]);
    // console.log('selected selection', selectedSelection);
    // Zoom for the top (displayed) node
    selection.filter(function (d) {
        let this_node = d3.select(this).datum().data;
        return this_node.name == params.current_name
    }).on('click.zoom', function(d) {
    // selectedSelection.on('click.zoom', function(d) {
        let this_node_maybe = d3.select(this).datum().data;
        // console.log('up!');
        // console.log('this node maybe', this_node_maybe);
        // console.log('this node datum', d3.select(this).datum());

        // Update the current node name
        params.current_name = this_node_maybe.parent;
        if (params.current_name == '') {params.current_name = "All Incidents"}
        console.log('set current_node_name to', params.current_name);

        // Update the current depth
        params.current_depth -= d3.select(this).datum().depth + 1;
        if (params.current_depth < 0) {params.current_depth = 0} // Minimum depth is 0
        console.log('set current depth to', params.current_depth);

        drawNodeLinkVis();
        drawSunburst();
    });
}

/**
 * Sophie's helpful showtooltip method
 * @param g where to put new elements in the DOM
 * @param node the node to show the tooltip about
 */
function showTooltip(g, node) {
    // console.log('showing tooltip for node, datum', node, node.datum());

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
    let name = datum.data.name;  //.replace("java\.base\.", "");

    // use node name and total size as tooltip text
    let text = `${name} (${numberFormat(datum.data.totalCount)} total incidents)`;

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