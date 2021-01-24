var express = require('express');
var app = express();
var cors = require('cors')

app.use(express.static(__dirname+ '/docs'));
app.use(cors);


app.listen(8080, () => console.log('Listening on 8080'));