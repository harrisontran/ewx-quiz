// Recordkeeping
var score = 0; // The player score
var selection = ""; // Name of the current, actively selected county/city
var selectionEntry = null;
var correct = [];
var countyMode = true; // True if guessing counties, false if guessing cities

/**
    Disable all use of the element button
**/
function disable(obj) {
    return obj.attr('disabled', true)
        .on('mouseover', null)
        .on('mouseout', null)
        .on('click', null)
        .on('mousedown', null);
}

const responseOptions = [
    'Nice!',
    'Awesome!',
    'Got one!',
    'Good work!',
    'Great!',
    'Neat!',
    'Awesome!',
]

const inputArea = d3.select("#input-area");


/** PLOT INIT **/
// set the dimensions and margins of the graph
var margin = {
    top: 10,
    right: 30,
    bottom: 50,
    left: 60
}
const width = 800 - margin.left - margin.right
const height = 400 - margin.top - margin.bottom;

var svg = d3.select("div#plot")
    .append("svg")
    .attr("id", "map")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");

const geoGroup = svg.append("g").attr("id", "geographyLayer")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
const outlineGroup = svg.append("g").attr("id", "outlineLayer")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
const placeGroup = svg.append("g").attr("id", "placeLayer")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
const labelGroup = svg.append("g").attr("id", "labelLayer")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

const FIPSEWX = [
    '48465', '48137', '48385', '48265', '48019', '48171', '48259', '48031',
    '48299', '48053', '48491', '48287', '48453', '48021', '48149', '48177',
    '48187', '48177', '48285', '48123', '48493', '48255', '48013', '48029',
    '48091', '48325', '48163', '48463', '48271', '48323', '48507', '48127',
    '48209', '48055'
]

// Add and stylize the input field
const drawInput = async function() {
    let typeStr = countyMode ? "county" : "community"
    const textInput = inputArea.append('input')
        .attr('type', 'text')
        .attr('id', 'entry')
        .attr('name', 'entry')
        .attr('disabled', true)
        .attr('placeholder', `Select a ${typeStr} on the map first.`)
        .attr('size', 50)
}

// Add and stylize the reveal button
const drawButton = async function() {
    const revealButton = inputArea.append('input')
        .attr('type', 'button')
        .attr('id', 'quit')
        .attr('Value', 'Reveal')
        .on('mouseover', function() {
            d3.select(this).transition().duration(200)
                .style("background-color", "#ff595e")
        })
        .on('mouseout', function() {
            d3.select(this).transition().duration(200)
                .style("background-color", "#571e20")
        })
        .on('mousedown', function() {
            d3.select(this).transition().duration(200)
                .style("background-color", "#641619")
        })
        .on('mouseup', function() {
            d3.select(this).transition().duration(200)
                .style("background-color", "#ff595e")
        })
}

const drawResponse = async function() {
    let typeStr = countyMode ? "counties" : "communities"
    const responseText = inputArea.append('p')
        .attr('id', 'response')
        .text(`Correct ${typeStr} will highlight when you've entered one correctly.`)
}

// Draw the map, generically
const drawMap = async function() {
    // Create map
    const stateID = "48"
    const us = await d3.json("counties-10m.json");
    let counties = topojson.feature(us, us.objects.counties);
    counties.features = counties.features.filter(function(a) {
        return FIPSEWX.includes(a.id)
    }); // filter counties
    projection = d3.geoAlbersUsa().fitSize([width, height], counties);
    let path = d3.geoPath().projection(projection);
    let countiesMesh = topojson.mesh(us, us.objects.counties, function(a, b) {
        return FIPSEWX.includes(a.id) || FIPSEWX.includes(b.id);
    });
    const communities = await d3.csv("communities.csv", d3.autoType);
    const typeStr = countyMode ? "county" : "community"

    communities.forEach(e => {
        e.position = projection([e.lon, e.lat])
    });

    var tooltip = d3.select("#plot")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)

    // configure input
    d3.select('input#entry').on("input", function() {
        let query = d3.select(this)
            .node().value.toLowerCase().replace(/\s/g, '');

        // If correct! (non-case sensitive, non-space sensitive)
        if (query === selection.toLowerCase().replace(/\s/g, '')) {
            console.log('Correctly labeled', selection)

            // Refresh the input
            d3.select(this)
                .attr('disabled', true)
                .attr('placeholder', `Select another ${typeStr}.`)
                .style('background-color', null)
            d3.select(this).node().value = null

            // Change the response text
            d3.select('#response').text(
                responseOptions[Math.floor(Math.random() * responseOptions.length)])

            // Mark object as correct
            correct.push(selection)
            console.log('LOG: Correctly labeled -', correct)
            selectionEntry.status = "correct"

            updateMap();
            score += 1;

            if ((score == counties.features.length) && (countyMode)) {
                endQuiz();
            } else if ((score == communities.length) && !(countyMode)) {
                endQuiz();
            }

        }
    })
    console.log('ACTION: Input configured')

    // Restart the game, resetting all settings
    function restart() {
        score = 0;
        selection = "";
        selectionEntry = null;
        correct = [];
        console.log('ACTION: Reset all saved variables!')
        d3.select("#input-area").html("");
        d3.select("#plot.parent").selectAll("*").remove();
        geoGroup.selectAll("path").attr("pointer-events", "auto")
        generateViz();
    }

    /**
        TODO
        Handles tasks that occur when the quiz is ended, either deliberately or by completion
    **/
    function endQuiz() {
        console.log(`Finished with a score of ${score}`)
        elementButton = d3.select('#quit')
            // Change button appearance
        elementButton.transition().duration(200)
            .style("background-color", "#1c734a")
            .attr("value", "Restart")
        elementButton.on('click', restart);

        if (countyMode) {
            // flag all counties
            geoGroup.selectAll("path").data(counties.features)
                .transition().duration(200)
                .attr("class", d => {
                    if (d.status === 'correct') {
                        return 'county-correct'
                    } else {
                        d.status = 'incorrect'
                        return "county-incorrect"
                    }
                }).style("fill", null)
            geoGroup.selectAll("path").attr("pointer-events", "none")
            labelGroup.selectAll("text").data(counties.features).attr("visibility", 'visible')
        } else {
            // flag all cities
            placeGroup.selectAll("circle").data(communities)
                .transition().duration(200)
                .attr("class", d => {
                    if (d.status === 'correct') {
                        return 'place-correct'
                    } else {
                        d.status = 'incorrect'
                        return "place-incorrect"
                    }
                }).style("fill", null)

            d3.select('#response').text("Mouseover cities to show their names!")
        }


        d3.select('input#entry').attr("placeholder", "Restart to try again!")
    }

    function clickObj(e, d) {
        let typeStr = countyMode ? "county" : "community"
        selectionEntry = d;
        selection = countyMode ? d.properties.name : d.name
        d.status = 'active'
        console.log('Set new active selection', selection)
        d3.select('input#entry')
            .attr('disabled', null)
            .style("background-color", "#1b66b2")
            .attr("placeholder", `Name the highlighted ${typeStr}`)
            .node().focus()
        updateMap();
    }

    // configure button
    d3.select('#quit').on('click', obj => endQuiz())
    console.log('ACTION: Reveal button configured')

    // Pre-populate county statuses
    counties.features.forEach(c => {
        c["status"] = "unknown"
    })
    communities.forEach(c => {
        c["status"] = "unknown"
    })

    console.log('DATA (counties):', counties.features);
    console.log('DATA (commmunities):', communities)

    function updateMap() {
        if (countyMode) {
            geoGroup.selectAll("path").data(counties.features)
                .transition().duration(200)
                .attr("class", d => {
                    if (d.status === 'correct') {
                        return 'county-correct'
                    } else if (d.properties.name === selection) {
                        return 'county-active'
                    } else if (d.status === 'incorrect') {
                        return 'county-incorrect'
                    } else {
                        return "county"
                    }
                }).style("fill", null)
            geoGroup.selectAll("path.county").attr("pointer-events", "auto")
            geoGroup.selectAll("path.county-active").attr("pointer-events", "none")
            geoGroup.selectAll("path.county-correct").attr("pointer-events", "none")
            geoGroup.selectAll("path.county-incorrect").attr("pointer-events", "none")

            labelGroup.selectAll("text").data(counties.features)
                .attr("visibility", d => {
                    if (correct.includes(d.properties.name)) {
                        return "visible"
                    } else {
                        return "hidden"
                    }
                })
        } else {
            placeGroup.selectAll("circle").data(communities)
                .transition().duration(200)
                .attr("class", d => {
                    if (d.status === 'correct') {
                        return 'place-correct'
                    } else if (d.name === selection) {
                        return 'place-active'
                    } else if (d.status === 'incorrect') {
                        return 'place-incorrect'
                    } else {
                        return "place"
                    }
                }).style("fill", null)
        }
        console.log('ACTION: Updated map')
    }

    // Counties stylize
    geoGroup.selectAll("path").data(counties.features)
        .join("path")
        .attr("class", "county")
        .attr("fips", d => d.id)
        .attr("name", d => d.properties.name) //.attr("mode", 'unknown')
        .attr("d", path)
        .on("mouseenter", function() {
            if (d3.select(this).attr("class") === "county" && countyMode) {
                d3.select(this).transition().duration(200).style("fill", "gray")
            }
        })
        .on("mouseleave", function() {
            if (d3.select(this).attr("class") === "county" && countyMode) {
                d3.select(this).transition().duration(200).style("fill", "#383939")
            }
        })
        .on("click", (event, d) => {
            if (countyMode) {
                clickObj(event, d)
            }
        });
    console.log('ACTION: Plotted counties')

    outlineGroup.append("path").datum(countiesMesh)
        .attr("class", "boundary")
        .attr("d", path);
    console.log('ACTION: Plotted places')


    if (!countyMode) {
        placeGroup.selectAll("circle").data(communities)
            .join("circle")
            .attr("class", "place")
            .attr("name", d => d.name) //.attr("mode", "unknown")
            .attr("cx", d => d.position[0])
            .attr("cy", d => d.position[1])
            .attr("population", d => d.population)
            .attr("r", d => 0.8 * Math.log(d.population))
            .on("mouseenter", (event, i) => {
                d3.select(event.target).transition().duration(200)
                    .style("fill", "cyan")
                    .style("opacity", 0.8)
                    .attr("r", 12)
                if (i.status === 'correct' || i.status === 'incorrect') {
                    tooltip.transition().duration(200)
                        .style("visibility", "visible").style("opacity", 1)
                }
            })
            .on("mouseleave", (event, i) => {
                d3.select(event.target).transition().duration(200)
                    .style("fill", null)
                    .style("opacity", null)
                    .attr("r", 0.8 * Math.log(i.population))
                if (i.status === 'correct' || i.status === 'incorrect') {
                    tooltip.transition().duration(200)
                        .style("visibility", "hidden").style("opacity", 0)
                }
            })
            .on("mousemove", (event, i) => {
                if (i.status === 'correct' || i.status === 'incorrect') {
                    tooltip.html(`${i.name}`)
                        .style("left", (d3.pointer(event)[0] + 160) + "px")
                        .style("top", (d3.pointer(event)[1] + 200) + "px")
                }

            })
            .on("click", (event, d) => {
                if (!(d.name === selection) && ['unknown', 'active'].includes(d.status)) {
                    clickObj(event, d);
                }
            })
    }

    labelGroup.selectAll("text").data(counties.features)
        .join("text")
        .attr("class", "countyLabel")
        .attr("x", d => path.centroid(d.geometry)[0])
        .attr("y", d => path.centroid(d.geometry)[1])
        .attr("dominant-baseline", "middle")
        .attr("text-anchor", "middle")
        .text(d => d.properties.name)
        .attr("value", d => d.properties.name)
        .attr("visibility", "hidden")
}

const generateViz = async function() {
    drawInput();
    drawButton();
    drawResponse();
    drawMap();
}


// Initialize buttons for selection
const initializeSettings = async function() {
    function clearSettings() {
        d3.select('#options').style('display', 'none');
        console.log('Hiding settings window')
    }

    // Stylize both Counties and Communities buttons
    d3.selectAll('.optionsButton')
        .on('mouseenter', function() {
            d3.select(this).transition().duration(200)
                .style('background-color', '#00faf4')
                .style('color', 'black')
        })
        .on('mouseleave', function() {
            d3.select(this).transition().duration(200)
                .style('background-color', null)
                .style('color', null)
        })

    // Set counties trigger
    d3.select('#pickCounties')
        .on('click', function() {
            console.log('Selected the Counties mode');
            clearSettings();
            countyMode = true;
            generateViz();
        })

    // Set communities trigger
    d3.select('#pickCommunities')
        .on('click', function() {
            console.log('Selected the Communities mode');
            clearSettings();
            countyMode = false;
            generateViz();
        })
}

initializeSettings();