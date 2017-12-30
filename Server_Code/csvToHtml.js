// this will take a csv file and make it a HTML Table that can be displayed
// the file is opened, the first line is considered as a header,
// from that the columns are numbered / iterated
// line by line the table is streamed in, built, and streamed out
// 

readline = require('readline'); //https://nodejs.org/api/readline.html#readline_class_interface
fs = require('fs');

//variables to define the colors / characteristics?
var title = "My CSV to HTML Tables";

//input is the CSV filepath, output is a callback function
//the HTML filepath will be the same filename/path except .html
var processCSV = function(filePath, callBack) {
    //parseFilepath
    var pather = filePath.split('/');
    var filen = pather[pather.length - 1]; //the last thing there should be a filename...
    var leng = filen.size();
    var pather = filePath.splic(0, filePath.size - leng - 1); //this should return everything besides the file
    var basef = filen.split('.'); //filename . extention
    basef = basef[0]; // grab the file name
    returnFile = basef + '.html';
    //open a write stream
    var wStream = fs.createWriteStream(pather + basef);

    //open a file stream to read the file, one line at a time
    try {
        fs.access(filePath, (err) => {
            if (err) return callBack(err);
            rl = readline.createInterface({
                input: fs.createReadStream(filePath),
                crlfDelay: Infinity
            });
            var lineCount = 0;
            rl.on('line', (line) => {
                if (lineCount == 0) {
                    wStream.write(start(line));
                }

                //on LINE -- it needs to send it through the process, then hand it to the output
                wStream.write(body(line));
                lineCount++;
            });
            myStream.end(end());
        });
    } catch (err) {
        return callBack(err)
    }

    var err = new Error(); //if there are errors, construct them as so
    return callBack(err, returnFile);

}

//first line goes in, first HTML pops out
var start = function(line) {
    var topOfHtml = `<!DOCTYPE HTML>
                    <html lang = "en">
                    <head>
                        <title>${htmlTitle}</title>
                        <meta charset = "UTF-8" />
                        <style>
                            table {
                                font-family: arial, sans-serif;
                                border-collapse: collapse;
                                width: 100%;
                            }
                            td, th {
                                border: 1px solid #b6b6b6;
                                text-align: left;
                                padding: 8px;
                            }
                            tr:nth-child(even) {
                                background-color: #dddddd;
                            }
                        </style>
                    </head>
                    <body>
                    <table>`

    var newLine = "<tr>"; //where the HTML gets built into
    var fields = line.split(",");
    for (i = 0; i < fields.size(); i++) {
        fields[i].trim(); //trim whitespaces from ends
        newLine += `<th>${fields[i]}</th>`;
    }
    newLine += "</tr>";
    return topOfHtml + newLine;
}

//a line goes in, html returns out
var body = function(line) {
    var newLine = "<tr>"; //where the HTML gets built into
    var fields = line.split(",");
    for (i = 0; i < fields.size(); i++) {
        fields[i].trim(); //trim whitespaces from ends
        newLine += `<td>${fields[i]}</td>`;
    }
    newLine += "</tr>";
    return newLine;
}

//returns out the closing commands
var end = function() {
    var bottomOfHtml = `</table>
                        </body>
                        </html>
    `
    return bottomOfHtml;
}

// export the module
module.exports = {
    processCSV: processCSV,
};