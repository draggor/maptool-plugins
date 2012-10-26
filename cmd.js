var util = require('./util')
  , config = require('./config')
  , fs = require('fs')
  ;

var CMD = {};
var PLAYERS = {};

function processMessages(msgs, c) {
	for(var i = 0; i < msgs.length; i++) {
		processMessage(msgs[i], c);	
	}
}

module.exports.processMessages = processMessages;
var connections = module.exports.connections = {};

function processMessage(msg, c) {
	var sp = util.split(msg, ' ', 2);
	var cmd = sp[0].toLowerCase().replace('\r', '');
	var args = {
		'str': sp[1]
	,	'client': c
	};

	console.log(cmd);

	if(CMD[cmd]) {
		if(CMD[cmd].marshal && CMD[cmd].auth) {
			if(args.client.isMarshal && args.client.auth) {
				CMD[cmd](args);
			} else {
				c.send('Double Whammy: You\'re not the Marshal and you need to /p ident!');
			}
		} else if(CMD[cmd].marshal) {
			if(args.client.isMarshal) {
				CMD[cmd](args);
			} else {
				c.send('You\'re not the Marshal!');
			}
		} else if(CMD[cmd].auth) {
			if(args.client.auth) {
				CMD[cmd](args);
			} else {
				c.send('You need to /p ident!');
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

var cardValues = [ '2','3','4','5','6','7','8','9','T','J','Q','K','A' ];
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
var initDeck = util.randomize(cards.slice());
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
	if(CMD.init.waiting && !CMD.init.received[args.client.ident]) {
		CMD.init.received[args.client.ident] = true;
		CMD.init.waiting--;
		var c = initDeck.pop();
		args.client.send('Initiative: ' + renderCard.maptool(c));
		CMD.init.map[args.client.ident] = c;
		if(CMD.init.waiting === 0) {
			CMD.initshow(args);
		}
		if(initDeck.length === 0) {
			initDeck = util.randomize(cards.slice());
			args.client.send('Last card drawn, Initiative Deck shuffling!');
		}
	}
};
CMD.init.map = {};
CMD.init.auth = true;
CMD.init.help = '/p init: Draw an initiative card.  If the last is drawn, shuffle.';

CMD.minit = function(args) {
	if(CMD.init.waiting && args.str && args.str.length > 0 && !CMD.init.received[args.str]) {
		CMD.init.received[args.str] = true;
		CMD.init.waiting--;
		var c = initDeck.pop();
		args.client.send(args.str + ' Initiative: ' + renderCard.maptool(c));
		CMD.init.map[args.str] = c;
		if(CMD.init.waiting === 0) {
			CMD.initshow(args);
		}
		if(initDeck.length === 0) {
			initDeck = util.randomize(cards.slice());
			args.client.send('Last card drawn, Initiative Deck shuffling!');
		}
	}
};
CMD.minit.auth = true;
CMD.minit.marshal = true;
CMD.minit.help = '/p minit name: Draw an initiative card for name';

CMD.initstart = function(args) {
	CMD.init.waiting = parseInt(args.str);
	CMD.init.received = {};
	CMD.init.map = {};
	args.client.send('<b>=====Waiting on ' + args.str + ' initiatives!=====</b>');
};
CMD.initstart.marshal = true;
CMD.initstart.help = '/p initstart qty: Enable the /p init command for qty number of unique clients.';

function sortCards (a, b) {
	var ac = CMD.init.map[a]
	  , bc = CMD.init.map[b]
	  , avr = cardValues.indexOf(ac[0])
	  , bvr = cardValues.indexOf(bc[0])
	  , asr = cardSuits.indexOf(ac[1])
	  , bsr = cardSuits.indexOf(bc[1])
	  ;

	if(asr < 0 && bsr < 0) {
		return ac[1] === 'R' ? -1 : 1;
	} else if(asr < 0) {
		return -1;
	} else if(bsr < 0) {
		return 1;
	} else {
		var result = bvr - avr;
		if(result === 0) {
			return bsr - asr;
		} else {
			return result;
		}
	}
}

CMD.initshow = function(args) {
	var str = ''
	  , order = Object.keys(CMD.init.map).sort(sortCards)
	  ;

	for(var k in order) {
		str += order[k] + ': ' + renderCard.maptool(CMD.init.map[order[k]]) + ' ';
	}
	if(str.length > 0) {
		args.client.send(str);
	}
};
CMD.initshow.marshal = true;
CMD.initshow.help = '/p initshow: Show the collected initiatives.';

CMD.showinit = CMD.initshow;

CMD.ident = function(args) {
	if(args.str && args.str.length > 0) {
		var sp = args.str.split(' ')
		  , name = sp[0]
		  , nameLower = sp[0].toLowerCase()
		  , pass = sp[1]
		  , p = PLAYERS[nameLower]
		  ;
		if(!pass || pass.length === 0) {
			args.client.send('You must supply a password!');
			return;
		}
		if(p && p.pass === pass) {
			args.client.auth = true;
			args.client.ident = name;
			args.client.pass = pass;
			args.client.send('Ident set to ' + name);
		} else if(p) {
			args.client.send('Ident Error: Wrong password for ' + name);
		} else if(args.client.ident && PLAYERS[args.client.ident.toLowerCase()]) {
			args.client.send('Ident Error: You already have an ident: ' + args.client.ident);
		} else {
			PLAYERS[nameLower] = p = {};
			p.fate = {white:0,red:0,blue:0,black:0};
			p.name = name;
			p.pass = pass;
			args.client.auth = true;
			args.client.ident = name;
			args.client.pass = pass;
			args.client.send('Ident set to ' + name);
		}
	} else {
		args.client.send('You did something wrong doing /p ident');
	}
};
CMD.ident.help = '/p ident name password: Set your identity to name.  If this name was previously unused, password can be anything, otherwise it must be the previous password.  This is for display purposes and tracking things like initiative and fate chips.';

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
	if(pot.length === 0) {
		args.client.send('Sorry cowpoke, pot\'s empty!');
		return;
	}

	var chip = pot.pop()
	  , p = PLAYERS[args.client.ident.toLowerCase()]
	  ;
	p.fate[chip]++;
	args.client.send(renderChip.maptool(chip));
};
CMD.fate.auth = true;
CMD.fate.help = '/p fate: Draw a fate chip from the pot.';

CMD.mfate = function(args) {
	if(pot.length === 0) {
		args.client.send('Sorry cowpoke, pot\'s empty!');
		return;
	}
	
	var chip = pot.pop()
	  , p = PLAYERS[args.client.ident.toLowerCase()]
	  ;
	while(chip === 'black') {
		pot.push(chip);
		util.randomize(pot);
		chip = pot.pop();
	}
	p.fate[chip]++;
	args.client.send(renderChip.maptool(chip));
};
CMD.mfate.marshal = true;
CMD.mfate.auth = true;
CMD.mfate.help = '/p mfate: Draw a fate chip for the Marshal.  This tries drawing until a non-black chip is found.';

CMD.spend = function(args) {
	var p = PLAYERS[args.client.ident.toLowerCase()];
	if(args.str && args.str.length > 0) {
		if(p.fate[args.str] && p.fate[args.str] > 0) {
			p.fate[args.str]--;
			args.client.send(args.client.ident + ' spent ' + renderChip.maptool(args.str));
			pot.push(args.str);
			util.randomize(pot);
		} else {
			args.client.send('You don\'t have any chips of that type!');
		}
	} else {
		args.client.send('You did something wrong with /p spend!');
	}
};
CMD.spend.map = {};
CMD.spend.auth = true;
CMD.spend.help = '/p spend color: Spend a fate chip of the selected color.  This adds it back to the pot unless it\'s legendary!';

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
CMD.addfate.help = '/p addfate type (qty): Add 1 fate chip of the given type or, if qty is specified, add that many instead.';

CMD.showfate = function(args) {
	var p = PLAYERS[args.client.ident.toLowerCase()]
	  , str = ''
	  ;
	for(var k in p.fate) {
		for(var i = 0; i < p.fate[k]; i++) {
			str += renderChip.maptool(k);
		}
	}
	args.client.send('Current Fate Chips: ' + str);
};
CMD.showfate.auth = true;
CMD.showfate.help = '/p showfate: displays how many and what kind of fate chips you have.';

CMD.fateshow = CMD.showfate;

CMD.save = function(args) {
	var output = {};
	output.pot = pot;
	output.players = PLAYERS;
	if(args.str && args.str.length > 0) {
		fs.writeFile('data/' + args.str, JSON.stringify(output), function(err) {
			if(err) {
				args.client.send('Error in saving: ' + err);
			} else {
				args.client.send('File saved: ' + args.str);
			}
		});
	} else {
		args.client.send('You did something wrong with /p save!');
	}
};
CMD.save.marshal = true;
CMD.save.help = '/p save filename: Save the current fate chip allocations and pot to a file.  This will also save idents and passwords.';

CMD.load = function(args) {
	if(args.str && args.str.length > 0) {
		fs.readFile('data/' + args.str, function(err, data) {
			if(err) {
				args.client.send('Error in loading: ' + err);
			} else {
				var input = JSON.parse(data);
				pot = input.pot;
				PLAYERS = input.players;
				args.client.send('File loaded: ' + args.str);
			}
		});
	} else {
		args.client.send('You did something wrong with /p load!');
	}

};
CMD.load.marshal = true;
CMD.load.help = '/p load filename: loads the pot, player fate chips, and player ident and passwords.';

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
