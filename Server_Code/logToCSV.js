//the logger to CSVfiles
var fs = require('fs');

//this will add a \n newline to the end of each data input.
//this program will automatically add date or time to the file, where the header indicates:
//"Date,Time, IP, Port, method, ListenPort, Login(Username), Password, Other Info (notes)\n";
//the above header will get a date and time to replace the first two fields, 
//  so that regular log line should feed like:
//  "garbage,garbage,realData,RealData,RealData, and more, real data" or
//  "-,-,IP,user,pass,comments,etc"

var toLog = function(file, data, headers) {
    //file is the full path/filename for the log
    //data is the string of data to add (with newlines or whatever)
    //headers is only used when a new file is created, 
    //this function returns true/false for success or not, 

    theDate = new Date().getFullYear().toString() + (new Date().getMonth() + 1).toString() + new Date().getDate().toString();
    theTime = new Date().getHours().toString() + ":" + new Date().getMinutes().toString() + ":" + new Date().getSeconds().toString();
    try {
        fs.access(file, (err) => {
            if (err) {
                console.error('log file does not exist, creating:' + file);
                //this creates and writes the headers
                var buf = new Buffer(headers);
                //fs.write(fd, buf, 0, buf.length, null, function(err) {
                fs.writeFile(file, buf, function(err) {
                    if (err) {
                        console.log("log error writing file:" + err);
                        return false;
                    }
                    return true;
                    //console.log("log created and started the file!");
                });
            }

            var buf = new Buffer(); //buffer to store the data

            //now if dat/time indicated in header, the data in those fields will be replaced by a date/time
            var spliced = data.split();
            var hSpliced = headers.split();
            for (i = 0; i < spliced.size(); i++) {
                if (hSpliced[i].toLowerCase() == 'date') {
                    buf += theDate + ',';
                } else if (hSpliced[i].toLowerCase() == 'time') {
                    buf += theTime + ',';
                } else {
                    buf += spliced[i] + ',';
                }
            }
            //buf should be complete, now add a newline
            buf += '\n';

            fs.appendFile(file, buf, function(err) {
                if (err) {
                    console.log("log error writing line to file:" + err);
                    return false;
                }
                //console.log("log wrote a new line to the file!");
                return true;
            });
        });
    } catch (err) {
        console.log("log file didnt open (new):" + err);
        return false;
    }
}

// export the module
module.exports = {
    toLog: toLog
};