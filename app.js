var express = require('express');
var path = require('path');
var ejs = require('ejs');
var url = require('url');


var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require("cookie-parser");



var app = express();
var app_socket;

app.use(express.static(path.join(__dirname, './static/')));
console.log(path.join(__dirname, './static/'));

app.get("/v", v);
app.post("/v", v);
app.get("/net", net);
app.get("/script", script);

function v(req, res, next) {
    var body = req.body || {};
    var headers = req.headers || [];
    var query = req.query || {};
    var key = req.query.key || "";

    var data = {
        headers: headers,
        body: body,
        query: query
    };
    if (app_socket) {
        app_socket.emit("capture" + key, {
            data: JSON.stringify(data)
        });
    }
    res.json(data);
}

function net(req, res, next) {
    var os = require('os');
        var ifaces = os.networkInterfaces();
        var data = {
            address: "serevr host",
        additonAddress: []
    };

    Object.keys(ifaces).forEach(function(ifname) {
        var alias = 0;


        ifaces[ifname].forEach(function(iface) {
            if ('IPv4' !== iface.family || iface.internal !==
                false) {
                // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                return;
            }

            if (alias >= 1) {
                // this single interface has multiple ipv4 addresses
                console.log(ifname + ':' + alias, iface.address);
                additonAddress.push(iface.address);
            } else {
                // this interface has only one ipv4 adress
                console.log(ifname, iface.address);
                data.address = iface.address;
            }
            ++alias;
        });
    });
    res.json(data);
}

function script(req, res, next) {
    var host = req.query.host;
    var key = req.query.key;
    var str = [
        'var host = "', host, '";',
        'var key = "', key, '";',
        'var remote_console={};',
        'var max_deep = 10;',
        'remote_console.log=function(data){',
        '   var query={};',
        '   query.key=key;',
        '   query.data = data;',
        '   var src = host+"/v?"+jsonToQuery(query);',
        '   var fakeImage = new Image();',
        '   fakeImage.src = src;',
        '};',
        'function jsonToQuery(obj) {',
        '    var strArray = [];',
        '    var objToString = function(obj, prefix,deep) {',
        '        var d=deep||0;',
        '        for (var i in obj) {',
        '            if (obj.hasOwnProperty(i)) {',
        '                var item = obj[i];',
        '                if(item === obj)return false;', //window.parent===window 会死循环
        '                if(i==="__proto__")return false;',
        '                var pre = prefix ? prefix + "[" + i + "]" : i;',
        '                if (typeof(item) === "string" || typeof(item) ==="number") {',
        '                    strArray.push(pre + "=" + item);',
        '                } else if (typeof(item) === "object") {',
        '                    if(d === max_deep){',
        '                    strArray.push(pre + "=" + "Object");}else{',
        '                    objToString(item, pre,d+1);}',
        '                }else if (typeof(item) === "function") {',
        '                    strArray.push(pre + "=" + "Function");',
        '                }',
        '            }',
        '        }',
        '    };',
        '    objToString(obj);',
        '    return strArray.join("&");',
        '}'
    ].join("");
    res.write(str);
    res.end();
}



//
var http = require('http');
var socket_io = require('socket.io');
//Create HTTP server.
var server = http.createServer(app);
var port = 8010;

var io = socket_io(server);
io.on('connection', function(socket) {
    app_socket = socket;
    socket.emit('news', {
        hello: 'world'
    });
    socket.on('my other event', function(data) {
        console.log('socket in coming');
        console.log(data);
    });
});
server.listen(port);
