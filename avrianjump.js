/**
 * Avrian Jump.
 *
 * A very simple ladder language for programming ATMega168s.
 *
 * This ladder language is not based on any other, and is mostly setup to be simple to use on a
 * touch device with HTML elements.  It also condenses down into an ASCII format the for most
 * things will fit into a tweet.
 *
 * This started out as a desire to be able to program an Arduino from an iOS device.  
 * Given that recreating the Arduino IDE in HTML seemed like too much work, the project was
 * reduced into something much simpler.  Mainly, a simple ladder language, and the Audioino
 * bootloader.
 *
 *
 *
 *
 *
 *
 *
 * Copyright (c) 2012 Michael Conrad Tadpol Tilstra 
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software
 * and associated documentation files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

$(function(){
	rawViewClose();
	addRung();
});

/***********************************************/
function rawViewOpen() {
	$(".ladder, .tools").hide();
	$(".rawView").show();
	$("#rawViewPort").val(ladderToASCII());
}

function rawViewClose() {
	$(".rawView").hide();
	$(".ladder, .tools").show();
	$("#rawViewPort").val("");
}

function rawViewLoad() {
	$(".rawView").hide();
	$(".ladder, .tools").show();
	ASCIIToLadder($('#rawViewPort').val());
}

/***********************************************/
function toASM() {
	var a = ladderToASCII();
	a = ASCIItoASM(a);
	var dataURI = "data:text/x-asm;base64," + escape(btoa(a));
	open(dataURI);
}

function toSrecord() {
	var a = ladderToASCII();
	a = ASCIItoASM(a);
	a = tadAvrAsm.assemble(a);

	if( 'errors' in a) {
		open("data:text/plain;base64," + escape(btoa(a.errors.join("\n"))));
	} else {
		open("data:text/x-srecord;base64," + escape(btoa(a.data)));
	}
}

function toAudioino() {
	var a = ladderToASCII();
	a = ASCIItoASM(a);
	a = tadAvrAsm.assemble(a, {'outmode': 'audioino'});

	if( 'errors' in a) {
		open("data:text/plain;base64," + escape(btoa(a.errors.join("\n"))));
	} else {
		//open("data:audio/wav;base64," + escape(btoa(a.data)));
		var dataURI = "data:audio/wav;base64," + escape(btoa(a.data));
		var audio = new Audio(dataURI);
		audio.play();
	}
}

function toBlinkit() {
	var a = ladderToASCII();
	a = ASCIItoASM(a);
	a = tadAvrAsm.assemble(a, {'outmode': 'blinkit'});

	if( 'errors' in a) {
		open("data:text/plain;base64," + escape(btoa(a.errors.join("\n"))));
	} else {
		tadAvrAsm.doBlinks($('#blinkittest')[0], a.data, 2);
	}
}

/***********************************************/
/**
 * Append a new rung with the default actions.
 */
function addRung() {
	var rung = $("#rungtemplate .rung").clone().appendTo(".ladder");
	appendTest(rung);
	rung.children('a:nth-child(2)').click(function(){appendAction(rung);});
	appendAction(rung);
	rung.children('a:nth-child(1)').click(function(){deleteRung(rung);});
}

/**
 * Delete the specified rung
 */
function deleteRung(rung) {
	rung.remove();
}

/**
 * Append a test to a rung.
 *
 * Rungs only get one test.
 */
function appendTest(rung) {
	var tst = $("#rungtemplate .test").clone().appendTo(rung);
	var s = tst.children("select[name='inputs']");
	var ta = tst.children("select[name='test']");
	var ia = tst.children("input");
	s.change(function() {
		// If T; hide test and input.
		// If D.; hide input and only show =1,=0
		// If A.; show input and only =<>!
		// If VAR; show input and only =<>!

		var s = $(this).children(":selected").attr("show");
		switch(s) {
			case 'none':
				ta.hide();
				ia.hide();
				break;
			case 'digital':
				ia.hide();
				ta.show();
				/* drop what it there */
				ta.children("option").remove();
				/* go get options to copy. */
				$("#rungtemplate .test select[name='test'] option[is='digital']").clone().appendTo(ta);
				break;
			case 'analog':
				ia.show();
				ta.show();
				/* drop what it there */
				ta.children("option").remove();
				/* go get options to copy. */
				$("#rungtemplate .test select[name='test'] option[is='analog']").clone().appendTo(ta);
				break;
		}
	});
	s.change();
}

/**
 * Append a new action to a rung.
 *
 * A rung can have multiple actions.
 */
function appendAction(rung) {
	var act = $("#rungtemplate .action").clone().appendTo(rung);
	var s = act.children("select[name='outputs']");
	var ta = act.children("select[name='act']");
	var ia = act.children("input");
	s.change(function() {
		// If T; hide test and input.
		// If D.; hide input and only show =1,=0
		// If A.; show input and only =<>!
		// If VAR; show input and only =<>!

		var s = $(this).children(":selected").attr("show");
		switch(s) {
			case 'none':
				ta.hide();
				ia.hide();
				break;
			case 'digital':
				ia.hide();
				ta.show();
				/* drop what it there */
				ta.children("option").remove();
				/* go get options to copy. */
				$("#rungtemplate .action select[name='act'] option[is='digital']").clone().appendTo(ta);
				break;
			case 'analog':
				ia.show();
				ta.show();
				/* drop what it there */
				ta.children("option").remove();
				/* go get options to copy. */
				$("#rungtemplate .action select[name='act'] option[is='analog']").clone().appendTo(ta);
				break;
		}

	});
	s.change();
	act.children('a').click(function(){deleteAction(act);});
}

/**
 * Delete an action.
 */
function deleteAction(action) {
	action.remove();
}


/**
 * Export the current ladder into a short ASCII format.
 */
function ladderToASCII() {
	var result=new Array();
	$.each($(".ladder .rung"), function(idx, elm) {
		elm = $(elm);
		var r = new Array();
		r.push(':');
		var t;
		t = elm.find(".test select[name='inputs'] :selected").attr('show');
		r.push( elm.find(".test select[name='inputs']").val() );
		switch(t) {
			case 'none':
				break;
			case 'digital':
				r.push( elm.find(".test select[name='test']").val() );
				break;
			case 'analog':
			default:
				r.push( elm.find(".test select[name='test']").val() );
				r.push( elm.find(".test input").val() );
				break;
		}
		r.push(';');
		var ar = new Array();
		$.each(elm.children(".action"), function(aidx, actions) {
			var r = new Array();
			actions = $(actions);
			t = actions.find("select[name='outputs'] :selected").attr('show');
			r.push( actions.find("select[name='outputs']").val() );
			r.push( actions.find("select[name='act']").val() );
			if( t == 'analog' ) {
				r.push( actions.find("input").val() );
			}
			ar.push( r.join('') );
		});
		r.push( ar.join(',') );

		result.push( r.join('') );
	});

	return result.join("\n");
}

/**
 * Break a test or action from a rung into its parts.
 */
function splittery(tstact) {
	var pinre = /T|A[0-7]|D(1[0-3]|[0-9])|P(P1[01]|[3569])|[A-E]/i;
	var digitalre = /=1|=0/;
	var analogre = /=|<|>|!|\+=|-=/;
	tstact = tstact.trim();
	try {
		var pin = pinre.exec(tstact)[0];
		if( pin.toUpperCase() == 'T' ) return ['T','',''];
		tstact = tstact.slice(pin.length);

		if( pin[0].toUpperCase() == 'D' && pin.length > 1 ) {
			/* digital */
			var dt = digitalre.exec(tstact)[0];
			return [pin, dt, ''];
		}
		/* else analog or variable */
		var at = analogre.exec(tstact)[0];
		var val = tstact.slice(at.length);
		return [pin, at, val];
	} catch(err) {
		return ['','',''];
	}
}

/**
 * Import a short ASCII format into the current ladder
 */
function ASCIIToLadder(ascii) {
	/* throw away everything before the first : */
	ascii = ascii.slice( ascii.indexOf(':') );

	$(".ladder .rung").remove();

	var rungs = ascii.split(':');
	for(var ri=1; ri < rungs.length; ri++) {
		addRung();
		var hrung = $(".ladder .rung:last-child");
		var r = rungs[ri].split(';');
		/* r[0] is the test. */
		var d = splittery(r[0]);
		var ht = hrung.children(".test");
		ht.children("select[name='inputs']").val(d[0]).change();
		ht.children("select[name='test']").val(d[1]);
		ht.children("input").val(d[2]);

		/* r[1] is the actions. */
		var actions = r[1].split(',');
		for( var ai=0; ai < actions.length; ai++) {
			if(ai>0) appendAction(hrung);
			d = splittery(actions[ai]);
			ht = hrung.children(".action:last-child");
			ht.children("select[name='outputs']").val(d[0]).change();
			ht.children("select[name='act']").val(d[1]);
			ht.children("input").val(d[2]);
		}
	}

}

/**
 * Convert a short ASCII format into AVR assembler.
 *
 * Most of this should then be a rather direct conversion of the rungs to asm
 */
function ASCIItoASM(ascii) {
	var result = new Array();

	function lo(v) {return v&0xff;}
	function hi(v) {return (v>>8)&0xff;}
	var Dpins = {
			'D0': ['D', 0],
			'D1': ['D', 1],
			'D2': ['D', 2],
			'D3': ['D', 3],
			'D4': ['D', 4],
			'D5': ['D', 5],
			'D6': ['D', 6],
			'D7': ['D', 7],
			'D8': ['B', 0],
			'D9': ['B', 1],
			'D10': ['B', 2],
			'D11': ['B', 3],
			'D12': ['B', 4],
			'D13': ['B', 5],
	};
	var Btst = {
		'=': 'breq',
		'>': 'brge', /* XXX Is >=, not >.  close enough for now. */
		'<': 'brlt',
		'!': 'brne'
	};
	var varLoc = {
		'A': 0,
		'B': 2,
		'C': 4,
		'D': 6,
		'E': 8,
	};

	/* push header.S into result. */
	result.push($("#ASMHeader").html());

	/* throw away everything before the first : */
	ascii = ascii.slice( ascii.indexOf(':') );
	var rungs = ascii.split(':');
	result.push("LADDER:");
	for(var ri=1; ri < rungs.length; ri++) {
		var r = rungs[ri].split(';');
		/* r[0] is the test. */
		var d = splittery(r[0]);
		// convert to asm, branch goes to endrung_{ri}
		if( d[0] == 'T' ) {
			result.push("\t; Always true.");
		}
		if( d[0].match(/^D\d+/) ) {
			result.push("\tcbi DDR" + Dpins[d[0]].join(',') ); /* as input */
			result.push("\tnop"); /* wait a little */
			if( d[1] == '=1' ) {
				result.push("\tsbis PIN" + Dpins[d[0]].join(',') );
			} else {
				result.push("\tsbic PIN" + Dpins[d[0]].join(',') );
			}
			result.push("\trjmp endrung_" + ri);
		}
		if( d[0].match(/^A\d+/) ) {
			result.push("\tldi r16, " + d[0].slice(1));
			result.push("\tcall getAnalog"); // result into 16:17
			result.push("\tsubi r16, " + lo(d[2]));
			result.push("\tsbci r17, " + hi(d[2]));
			result.push("\t" + Btst[d[1]] + " 1"); // jump over jump if true.
			result.push("\trjmp endrung_" + ri);
		}
		if( d[0].match(/^[A-E]$/) ) {
			// test variable.
			result.push("\tmovw r16, r" + varLoc[d[0]]);
			result.push("\tsubi r16, " + lo(d[2]));
			result.push("\tsbci r17, " + hi(d[2]));
			result.push("\t" + Btst[d[1]] + " 1"); // jump over jump if true.
			result.push("\trjmp endrung_" + ri);
		}
		result.push("\t; End Test");

		/* r[1] is the actions. */
		var actions = r[1].split(',');
		for( var ai=0; ai < actions.length; ai++) {
			d = splittery(actions[ai]);
			// convert to asm
			if( d[0].match(/^D\d+/) ) {
				result.push("\tsbi DDR" + Dpins[d[0]].join(',') ); /* as output */
				result.push("\tnop"); /* wait a little */
				if( d[1] == '=1' ) {
					result.push("\tsbi PORT" + Dpins[d[0]].join(',') );
				} else {
					result.push("\tcbi PORT" + Dpins[d[0]].join(',') );
				}
			}
			if( d[0].match(/^P\d+/) ) {
				result.push("\tldi r16, " + lo(d[2]));
				result.push("\tldi r17, " + hi(d[2]));
				result.push("\tldi r18, " + d[0].slice(1));
				result.push("\tcall setPWM");
			}
			if( d[0].match(/^[A-E]$/) ) {
				/* set or modify variable. */

				/* Load value into registers */
				result.push("\tldi r16, " + lo(d[2]));
				result.push("\tldi r17, " + hi(d[2]));

				switch(d[1]) {
					case '=':
						break;
					case '+=':
						result.push("\tadd r16, r" + (varLoc[d[0]]));
						result.push("\tadc r17, r" + (varLoc[d[0]] + 1));
						break;
					case '-=':
						result.push("\tsub r16, r" + (varLoc[d[0]]));
						result.push("\tsbc r17, r" + (varLoc[d[0]] + 1));
						break;
					default:
						throw "Bad action";
				}
				/* Save results */
				result.push("\tmovw r" + varLoc[d[0]] + ", r16");
			}
			result.push("\t; End Action");
		}

		result.push("endrung_" + ri + ":");
	}
	result.push("\tjmp LADDER");

	return result.join("\n");
}



/* vim: set cin sw=4 ts=4 noet : */
