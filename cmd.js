var CMD = {};

function processMessages(msgs, c) {
	for(var i = 0; i < msgs.length; i++) {
		processMessage(msgs[i], c);	
	}
}

module.exports.processMessages = processMessages;

function processMessage(msg, c) {
	var sp = msg.split(' ', 2);
	var cmd = sp[0].toLowerCase().replace('\r', '');
	var args = {
		'str': sp[1]
	,	'client': c
	};

	console.log(cmd);

	if(CMD[cmd]) {
		CMD[cmd](args);
	} else {
		c.send('bork');
	}
}

CMD.echo = function(args) {
	args.client.send(args.str);
};

CMD.hello = function(args) {
	args.client.send('ohai\n');
};

var cardValues = [ 2,3,4,5,6,7,8,9,'T','J','Q','K','A' ];
var cardSuits = [ 'D', 'C', 'H', 'S' ];
var cardSuitSymbols = {
	'D': '&diams;'
,	'C': '&clubs;'
,	'H': '&hearts;'
,	'S': '&spades;'
,	'R': 'R'
,	'B': 'B'
};
var cards = [ 'JR', 'JB' ];
for(var val in cardValues) {
	for(var suit in cardSuits) {
		cards.push(cardValues[val] + cardSuits[suit]);
	}
}

CMD.card = function(args) {
	var c = cards[Math.floor(Math.random() * 54)];
	var s = c[1];
	if(s === 'R' || s === 'D' || s === 'H') {
		args.client.send('<span style="color:red">' + c[0] + cardSuitSymbols[c[1]] + '</span>');
	} else {
		args.client.send('<span style="color:black">' + c[0] + cardSuitSymbols[c[1]] + '</span>');
	}
};
