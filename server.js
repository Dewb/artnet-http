var express = require('express');
var app = express();
var bodyParser = require('body-parser');

const commandLineArgs = require('command-line-args');
const optionDefinitions = [
    { name: 'artnet_host', alias: 'a', type: String, description: "IP address of the ArtNet server." },
    { name: 'artnet_port', type: Number, defaultValue: 6454, description: "ArtNet UDP port (6454 is standard.)"},
    { name: 'listen_port', alias: 'p', type: Number, defaultValue: 8000, description: "HTTP port to listen on." },
    { name: 'verbose', alias: 'v', type: Boolean, description: "Display transmitted packets on the console."}
];

const options = commandLineArgs(optionDefinitions)

const getUsage = require('command-line-usage')
const sections = [
    {
        header: 'artnet-http bridge',
        content: 'Bridges HTTP POST requests to ArtNet UDP'
    },
    { 
        header: 'Options',
        optionList: optionDefinitions
    },
    { 
        header: 'Examples',
        content: [
            '[italic]{Start the HTTP server on the default port, sending ArtNet requests to localhost}\n',
            '$ node server.js [bold]{-h} 127.0.0.1',
            '\n[italic]{Start the HTTP server on port 9000, sending ArtNet requests to a remote host, with verbose output}\n',
            '$ node server.js [bold]{-v -h} 10.0.1.17 [bold]{-p} 9000'
        ]
    },
    {
        header: 'HTTP interface',
        content: [
            'The server will listen on [bold]{/} for POST requests. ' + 
            'Posting a JSON body containing an array of numbers between 0 and 255 will write those values to ' +
            'ArtNet universe 0, starting with channel 1. For example:\n',
            '$ curl -X POST 127.0.0.1:8000 -H "Content-Type: application/json" -d "[255, 255, 255]"', 
            '\nYou can optionally provide a universe and starting channel number in the HTTP route.' +
            'For example, to set the first three channels of universe 2 to 255:\n',
            '$ curl -X POST 127.0.0.1:8000/2 -H "Content-Type: application/json" -d "[255, 255, 255]"', 
            '\nTo set channels 12, 13, and 14 of universe 4 to 0:\n',
            '$ curl -X POST 127.0.0.1:8000/4/12 -H "Content-Type: application/json" -d "[0, 0, 0]"'
        ]
    }
]

if (!options.artnet_host) {
    console.log(getUsage(sections));
    process.exit();
}

var artnet = require('artnet')({ 
    host: options.artnet_host, 
    port: options.artnet_port 
});

app.use(bodyParser.json())

app.post('/:universe?/:channel?', (req, res) => {
    
    var universe = req.params.universe || 0;
    var channel  = req.params.channel  || 1;

    var responseFn = (err, artnet_res) => {
        if (err) {
            if (options.verbose) {
                console.log(err);
            }
            res.status(500).send(err);
        }
        res.sendStatus(200);
    };
    
    if (options.verbose) {
        console.log(universe + "/" + channel + " " + req.body);
    }
    
    if (Array.isArray(req.body)) {
        artnet.set(universe, channel, req.body, responseFn);
    } else {
        if (options.verbose) {
            console.log("Bad request body: " + req.body);
        }
        res.sendStatus(400);
    }
});

console.log('Listening on port ' + options.listen_port);
app.listen(options.listen_port)

process.on('exit', (code) => {
    artnet.close();
});