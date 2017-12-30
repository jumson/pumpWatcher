//test 
var http = require('http');
var fs = require('fs');
var csv = require('csv');
var exec = require('child_process').exec; //this is to execute a command in bash
var trans = require('./csvToHtml.js'); //this will take a csv file and process/ return a html file of a table
var logger = require('./logToCSV.js').toLog;
var readline = require('readline');

//fs.appendFileSync(file, data)
var dataFile = "pumpData.csv";
var dataPath = "/home/notroot/blynk/";
var dataFull = dataPath + dataFile;
var dataHeader = "Date,Time, Type, Water Level(in), Water Level(raw), Total Pumps, Start Pump Level(Inches), Stop Pump Level(Inches)\n";
var json = {}; //empty JSON to modify instead of passing it around 

//now if the pump is going on or offf -- that gets its own data logger!
http.createServer(function(request, response) {
    var things = 0;
    if (request.url.indexOf("pump") != -1) {
        //console.log('logging requested');
        response.writeHead(200, { 'Content-type': 'text/plain' });
        response.write('pump data...logging', function() {

            response.end();
        });
        //printPumpDataUrl(request.url);

        //https://nodejs.org/api/fs.html
        //http://stackabuse.com/writing-to-files-in-node-js/
        buf = new Buffer("datetime," + csvDataFromUrl(request.url) + "\n");
        logger(dataFull, buf, dataHeader);
        console.log('logged:' + things++);


    } else if (request.url.indexOf("data") != -1) {

        console.log('data requested');
        try {
            response.writeHead(200, { 'Content-Type': 'text/html' });

            rl = readline.createInterface({ input: fs.createReadStream(dataFull), crlfDelay: Infinity });
            var lineCount = 0;
            rl.on('line', (line) => {
                if (lineCount == 0) {
                    response.write(trans.start(line), function(err) {
                        if (err) console.log('error on head streaming:' + err);
                        console.log('html header streamed');
                    });
                    lineCount++;
                } else {
                    response.write(trans.body(line), function(err) {
                        if (err) console.log('error on streaming:' + err);
                        console.log('html file streamed');
                    });
                    lineCount++;
                }
                //on LINE -- it needs to send it through the process, then hand it to the output

            });

            rl.on('close', function() {
                response.write(trans.end(), function(err) {
                    if (err) console.log('error on end streaming:' + err);
                    console.log('html header streamed');
                });
                console.log('close called,streaming ending with linecount:' + lineCount);
            });



        } catch (err) {

            response.writeHead(400, { "Content-Type": "text/plain" });
            response.end("ERROR HTML File does not exist:" + err);
            console.log("HTML download thing error:" + err);
        }
        //})
    } else if (request.url.indexOf("hackingme") != -1) {
        console.log('data requested');
        try {
            response.writeHead(200, {
                'Content-Type': 'text/html'
            });

            rl = readline.createInterface({
                input: fs.createReadStream('/home/notroot/blynk/fakeSSHData.csv'),
                crlfDelay: Infinity
            });
            var lineCount = 0;
            rl.on('line', (line) => {
                if (lineCount == 0) {
                    response.write(trans.start(line), function(err) {
                        if (err) console.log('error on head streaming:' + err);
                        console.log('html header streamed');
                        lineCount++;
                    });
                } else {
                    response.write(trans.body(line), function(err) {
                        if (err) console.log('error on streaming:' + err);
                        console.log('html file streamed');
                        lineCount++;
                    });

                }
                //on LINE -- it needs to send it through the process, then hand it to the output

            });

            rl.on('close', function() {
                response.write(trans.end(), function(err) {
                    if (err) console.log('error on end streaming:' + err);
                    console.log('html header streamed');
                });
                console.log('close called,streaming ending lines:' + lineCount);
            });



        } catch (err) {

            response.writeHead(400, { "Content-Type": "text/plain" });
            response.end("ERROR HTML File does not exist:" + err);
            console.log("HTML download thing error:" + err);
        }
        //})
    } else if (request.url.indexOf("download") != -1) {
        try {
            //https://stackoverflow.com/questions/10046039/nodejs-send-file-in-response
            //https://nodejs.org/dist/latest-v6.x/docs/api/fs.html#fs_fs_readfile_file_options_callback
            //http://adrianmejia.com/blog/2016/08/24/Building-a-Node-js-static-file-server-files-over-HTTP-using-ES6/

            // --get stats - to pull the current file size
            var stat = fs.statSync(dataFull); //this blocks writing log data!
            // if the file is found, set Content-type and send data
            console.log("stat worked - filesize:" + stat.size);
            response.writeHead(200, {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename=' + dataFile,
                'Content-Length': stat.size
            }); // "text/csv" //"Content-Length": stat.size
            try {
                var buf = fs.readFileSync(dataFull);
                response.write(buf);
                console.log('file readed');
            } catch (err) {
                if (err) console.log("readFile didnt work:" + err);
            }
            console.log("downloading done");

        } catch (err) {

            response.writeHead(400, { "Content-Type": "text/plain" });
            response.end("ERROR File does not exist:" + err);
            console.log("download thing error:" + err);
        }

    } else {
        response.writeHead(200, { 'Content-type': 'text/plain' });
        response.write('Hello  Server Response');
        response.write(', you sent:');
        response.write(request.url, function() {
            response.end();
        });
    }
    //response.end();
}).listen(7000);

function printPumpDataUrl(data) {
    data = csvDataFromUrl(data);
    var parsed = data.split(",", 7);
    var formattedData = "";
    //date_time,WaterLevel(raw),WaterLevel(in),totalPumps,startPump(inches),stopPump(inches),
    var headers = ["YYYYMMDD_HH:MM:SS-", "Type", "Water Level(raw)-", "Water Level(in)-", "Total Pumps-", "Start Pump Level(Inches)", "Stop Pump Level(Inches)"];
    for (i = 0; i < 7; i++) {
        console.log(headers[i] + parsed[i]);
    }
    return formattedData;
}

function csvDataFromUrl(data) {
    var dataStart = data.indexOf("?");
    var dataSlice = data.slice(dataStart + 1); //dont want the ?
    return dataSlice;
}