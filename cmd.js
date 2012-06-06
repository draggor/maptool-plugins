var util = require('./util')
  , config = require('./config')
  ;

var CMD = {};

function processMessages(msgs, c) {
	for(var i = 0; i < msgs.length; i++) {
		processMessage(msgs[i], c);	
	}
}

module.exports.processMessages = processMessages;
var connections = module.exports.connections = {};

function processMessage(msg, c) {
	var sp = msg.split(' ', 2);
	var cmd = sp[0].toLowerCase().replace('\r', '');
	var args = {
		'str': sp[1]
	,	'client': c
	};

	console.log(cmd);

	if(CMD[cmd]) {
		if(CMD[cmd].marshal) {
			if(args.client.isMarshal) {
				CMD[cmd](args);
			} else {
				c.send('You\'re not the Marshal!');
			}
		} else {
			CMD[cmd](args);
		}
	} else {
		c.send('Command "' + cmd + '" not found.');
	}
}

CMD.echo = function(args) {
	if(args.str && args.str.length > 0) {
		args.client.send(args.str);
	}
};
CMD.echo.help = '/p echo text: echo echo echo echo echo echo...';

CMD.hello = function(args) {
	args.client.send('ohai\n');
};
CMD.hello.help = '/p hello: say ohai';

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
var formattedCards = [];
for(var i in cards) {
	var c = cards[i];
	var s = c[1];
	if(s === 'R' || s === 'D' || s === 'H') {
		formattedCards.push('<span style="color:red">' + c[0] + cardSuitSymbols[c[1]] + '</span>');
	} else {
		formattedCards.push('<span style="color:black">' + c[0] + cardSuitSymbols[c[1]] + '</span>');
	}
}
var playerDecks = {};
var renderCard = {
	maptool: function(c) {
		var s = c[1];
		if(s === 'R' || s === 'D' || s === 'H') {
			return '<span style="color:red">' + c[0] + cardSuitSymbols[c[1]] + '</span>';
		} else {
			return '<span style="color:black">' + c[0] + cardSuitSymbols[c[1]] + '</span>';
		}
	}
};
var deck = util.randomize(formattedCards.slice());
var initDeck = util.randomize(formattedCards.slice());
CMD.card = function(args) {
	args.client.send(formattedCards[Math.floor(Math.random() * 54)]);
};
CMD.card.help = '/p card: Display a random card.';

CMD.draw = function(args) {
	var pd = playerDecks[args.client.id];
	pd = pd || util.randomize(formattedCards.slice());
	playerDecks[args.client.id] = pd;

	var c = '';
	if(args.str) {
		var num = parseInt(args.str);
		if(num > pd.length) {
			playerDecks[args.client.id] = pd = util.randomize(formattedCards.slice());
			args.client.send('Not enough cards left, shuffling personal deck!');
		}
		for(var i = 0; i < num; i++) {
			c += pd.pop() + ' ';
		}
	} else {
		c = pd.pop();
	}
	args.client.send('Draw: ' + c);
	if(pd.length == 0) {
		playerDecks[args.client.id] = pd = util.randomize(formattedCards.slice());
		args.client.send('Last card drawn, shuffling personal deck!');
	}
};
CMD.draw.help = '/p draw (qty): Draw a card from the player\'s personal deck, or, if qty is specified, draw that many instead.  This will shuffle if there are not enough cards left.';

CMD.shuffle = function(args) {
	playerDecks[args.client.id] = util.randomize(formattedCards.slice());
	args.client.send('Personal deck shuffled.');
};
CMD.shuffle.help = '/p shuffle: Shuffle the player\'s personal deck.';

CMD.initshuffle = function(args) {
	initDeck = util.randomize(formattedCards.slice());
	args.client.send('Initiative Deck shuffled.');
};
CMD.initshuffle.marshal = true;
CMD.initshuffle.help = '/p initshuffle: Shuffle the initiative deck.';

CMD.init = function(args) {
	if(CMD.init.waiting && !CMD.init.received[args.client.id]) {
		CMD.init.received[args.client.id] = true;
		CMD.init.waiting--;
		var c = initDeck.pop();
		args.client.send('Initiative: ' + c);
		CMD.init.map[args.client.id] = c;
		if(CMD.init.waiting === 0) {
			CMD.initshow(args);
		}
		if(initDeck.length === 0) {
			initDeck = util.randomize(formattedCards.slice());
			args.client.send('Last card drawn, Initiative Deck shuffling!');
		}
	}
};
CMD.init.map = {};
CMD.init.help = '/p init: Draw an initiative card.  If the last is drawn, shuffle.';

CMD.initstart = function(args) {
	CMD.init.waiting = parseInt(args.str);
	CMD.init.received = {};
	CMD.init.map = {};
	args.client.send('<b>=====Waiting on ' + args.str + ' initiatives!=====</b>');
};
CMD.initstart.marshal = true;
CMD.initstart.help = '/p initstart qty: Enable the /p init command for qty number of unique clients.';

CMD.initshow = function(args) {
	var str = '';
	for(var k in CMD.init.map) {
		str += connections[k].ident + ': ' + CMD.init.map[k] + ' ';
	}
	if(str.length > 0) {
		args.client.send(str);
	}
};
CMD.initshow.marshal = true;
CMD.initshow.help = '/p initshow: Show the collected initiatives.';

CMD.ident = function(args) {
	if(args.str.length > 0) {
		args.client.ident = args.str;
	}
};
CMD.ident.help = '/p ident name: Set your identity to name.  This is for display purposes.';

var renderChip = {
	maptool: function(chip) {
		return '<b><span style="color:' + (chip === 'white' ? 'gray' : chip) + '">&#9679;</span></b>';
	}
};
var startingFateChips = { white: 20, red: 10, blue: 5, black: 0 };
var startingFateChipPot = [];
for(var k in startingFateChips) {
	for(var i = 0; i < startingFateChips[k]; i++) {
		startingFateChipPot.push(k);
	}
}

var pot = util.randomize(startingFateChipPot.slice());
CMD.fate = function(args) {
	args.client.send(renderChip.maptool(pot.pop()));
	if(pot.length === 0) {
		pot = util.randomize(startingFateChipPot.slice());
	}
};
CMD.fate.help = '/p fate: Draw a fate chip from the pot.';

CMD.mfate = function(args) {
	var chip = pot.pop();
	while(chip === 'black') {
		pot.push(chip);
		util.randomize(pot);
		chip = pot.pop();
	}
	args.client.send(renderChip.maptool(chip));
};
CMD.mfate.marshal = true;
CMD.mfate.help = '/p mfate: Draw a fate chip for the Marshal.  This tries drawing until a non-black chip is found.';

CMD.addfate = function(args) {
	var sp = args.str.split()
	  , type = sp[0]
	  , qty = sp[1]
	  ;
	if(startingFateChips[type] > 0) {
		if(qty) {
			for(var i = 0; i < qty; i++) {
				pot.push(type);
			}
		} else {
			pot.push(type);
		}
		util.randomize(pot);
		args.client.send('Chips added');
	}
};
CMD.addfate.marshal = true;
CMD.addfate.help = '/p addfate type (qty): Add 1 fate chip of the given type or, if qty is specified, add that many instead.'

CMD.marshal = function(args) {
	if(args.str === config.marshalPass) {
		args.client.isMarshal = true;
		args.client.send('You are now the Marshal.');
	}
};
CMD.marshal.help = '/p marshal pass: authenticate yourself as the Marhsal with "pass"';

CMD.help = function(args) {
	if(args.str && CMD[args.str] && CMD[args.str].help) {
		args.client.send(CMD[args.str].help);
	} else {
		var str = 'Commands: ';
		for(var k in CMD) {
			str += k + (CMD[k].marshal ? '(M), ' : ', ');
		}
		args.client.send(str.substr(0, str.length - 2));
	}
};
CMD.help.help = '/p help command: Get help for a given command.  The (M) in the list means it is a Marshal only command.';
