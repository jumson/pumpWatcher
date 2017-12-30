//test 
var http = require('http');
var fs = require('fs');
var csv = require('csv');
var exec = require('child_process').exec; //this is to execute a command in bash

//fs.appendFileSync(file, data)
var dataFile = "pumpData.csv";
var dataPath = "/home/notroot/blynk/";
var dataFull = dataPath + dataFile;
var dataHeader = "YYYYMMDD_HH:MM:SS, Type, Water Level(raw), Water Level(in), Total Pumps, Start Pump Level(Inches), Stop Pump Level(Inches)\n";
var json = {}; //empty JSON to modify instead of passing it around 

//now if the pump is going on or offf -- that gets its own data logger!
http.createServer(function(request, response) {

    if (request.url.indexOf("pump") != -1) {
        //console.log('logging requested');
        response.writeHead(200, { 'Content-type': 'text/plain' });
        response.write('pump data...logging', function() {
            response.end();
        });
        //printPumpDataUrl(request.url);

        //https://nodejs.org/api/fs.html
        //http://stackabuse.com/writing-to-files-in-node-js/
        try {
            fs.access(dataFull, (err) => {
                try {
                    if (err) {
                        console.error('log file does not exists');
                        //this creates and writes the headers
                        var buf = new Buffer(dataHeader);
                        //fs.write(fd, buf, 0, buf.length, null, function(err) {
                        fs.writeFile(dataFull, buf, function(err) {
                            if (err) console.log("error writing file:" + err);
                            console.log("created and started the file!");
                        });
                    }
                    //now add the line of data
                    buf = new Buffer(csvDataFromUrl(request.url) + "\n");
                    fs.appendFile(dataFull, buf, function(err) {
                        if (err) console.log("error writing line to file:" + err);
                        console.log("wrote a new line to the file!");
                    });

                } catch (err) {
                    console.log("some outlandish:" + err);
                }

            });


        } catch (err) {
            console.log("file didnt open (new):" + err);
            //because it already exists...so append!
            try {
                fs.open(dataFull, 'a', (err, fd) => {
                    if (err) console.log("the error (a) here:" + err);
                    //append stuff
                    buf = new Buffer(csvDataFromUrl(request.url) + "\n");

                    fs.close(fd, function(err) {
                        if (err) console.log("error on closing:" + err);
                        console.log("file closed!");
                    });
                });


            } catch (err) {
                console.log("failed to open (a):" + err);
            }
            console.log("done....giving up");
        }

    } else if (request.url.indexOf("data") != -1) {

        console.log('data requested');
        var times = Date.now();
        //response.writeHead(200, { 'Content-Type': 'text/html' });

        //covert the csv in bash to out.html --
        //https://stackoverflow.com/questions/5255449/convert-csv-to-html-table-using/5256320#5256320
        //echo "<html><head><style>table, th, td {border: 1px solid black;}</style></head><table><tr><th>YYYYMMDD_HH:MM:SS</th><th> Type</th><th> Water Level(raw)</th><th> Water Level(in)</th><th> Total Pumps</th><th> Start Pump Level(Inches)</th><th> Stop Pump Level(Inches)</th></tr>" >> outF.html; while read INPUT ; do echo "<tr><td>${INPUT//,/</td><td>}</td></tr>" >> outF.html; done < pumpData.csv ; echo "</table><html>"  >> outF.html
        try {
            var flyFileName = `${times}out.html`;
            var flyFileFull = dataPath + flyFileName;
            var cmd1 = 'echo "<html><head><style>table, th, td {border: 1px solid black;}</style></head><table><tr><th>YYYYMMDD_HH:MM:SS</th><th> Type</th><th> Water Level(raw)</th><th> Water Level(in)</th><th> Total Pumps</th><th> Start Pump Level(Inches)</th><th> Stop Pump Level(Inches)</th></tr>" >> ' + flyFileFull + ' ; while read INPUT ; do echo "<tr><td>${INPUT//,/</td><td>}</td></tr>" >> ' + flyFileFull + '; done < pumpData.csv ; echo "</table><html>"  >> ' + flyFileFull + ';';
            var converted = false;
            console.log(cmd1);
            exec(cmd1, function(err, stdout, stderr) {
                if (err) {
                    console.log("conversion had error:" + err);
                }
                console.log("conversion complete!");
                converted = true;
                if (converted) {
                    try {
                        //https://stackoverflow.com/questions/10046039/nodejs-send-file-in-response
                        //https://nodejs.org/dist/latest-v6.x/docs/api/fs.html#fs_fs_readfile_file_options_callback
                        //http://adrianmejia.com/blog/2016/08/24/Building-a-Node-js-static-file-server-files-over-HTTP-using-ES6/

                        // --get stats - to pull the current file size
                        var stat = fs.statSync(flyFileFull); //this blocks writing log data!
                        // if the file is found, set Content-type and send data
                        console.log("stat worked - filesize:" + stat.size);
                        response.writeHead(200, {
                            'Content-Type': 'text/html',
                            'Content-Disposition': 'attachment; filename=' + flyFileName,
                            'Content-Length': stat.size
                        }); // "text/csv" //"Content-Length": stat.size

                        try {
                            fs.watch(flyFileFull, function(event, filename) {
                                console.log('event is: ' + event);
                                if (filename) {
                                    console.log('filename provided: ' + filename);
                                } else {
                                    console.log('filename not provided');
                                }
                            });

                            var buf = fs.readFileSync(flyFileFull);
                            response.write(buf, function(err) {
                                if (err) {
                                    console.log('error on writing:' + err);
                                }
                                console.log('html file readed and writed');
                            });

                        } catch (err) {
                            if (err) console.log("html readFile didnt work:" + err);
                        }
                        console.log("html downloading done");

                    } catch (err) {

                        response.writeHead(400, { "Content-Type": "text/plain" });
                        response.end("ERROR HTML File does not exist:" + err);
                        console.log("HTML download thing error:" + err);
                    }

                    console.log('file readed for data display');
                }
                //serve up the html

            });


        } catch (err) {
            if (err) console.log("html data conversion/display didnt work:" + err);
        }

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