var net = require('net')
,   cmd = require('./cmd')
;

function send(msg) {
	var bmsg = new Buffer(msg);
	var l = bmsg.length;
	var nb = Math.ceil(l / 255);
	var b = new Buffer(nb + l);
	
	for(var i = 0; i < nb; i++) {
		b[i] = l > 255 ? 255 : l;
		l -= 255;
	}
	bmsg.copy(b, nb);

	this.write(b);
}

var server = net.createServer(function(c) {
	var buf = '';
	c.send = send;
	console.log('Client Connected!');
	c.on('data', function(data) {
		console.log(data.length);
		var str = data.toString();
		if(str.indexOf('\n') < 0) {
			buf += str;
		} else {
			var sp = str.split('\n');
			console.log(sp);
			buf = sp.pop();
			cmd.processMessages(sp, c);
		}
	});
});

server.listen('1337');
