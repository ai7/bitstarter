var express = require('express')
var fs = require('fs');

var app = express()

var myReadFile = function(fname) {
    // readFileSync() returns a Buffer
    var data = fs.readFileSync(fname);
    return data.toString();
};

app.set('port', (process.env.PORT || 5000))
app.use(express.static(__dirname + '/public'))

app.get('/', function(request, response) {
  response.send(myReadFile('index.html'));
})

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
})
