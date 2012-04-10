/**
 * Take an array of data and turn it into a blinking div.
 *
 * !!! you must have loaded the asmToAudio.js file first !!!
 * 
 * The blinking pattern is designed to be handled by the Audioino bootloader.
 * See: http://www.hobby-roboter.de/forum/viewtopic.php?f=4&t=128&p=531 
 * But instead of wiring up an audio cable, a photo sensor is wired in.
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

(function(tadAvrAsm, undefined ) {

	/**
	 * Converts an array of program data into a manchester encoded signal array.
	 */
	function numsToSignal(hexes) {
		/* The format that the Audioino boot loader expects seems to be as follows:
		 * The wave data is broken into frames.
		 * Each Frame is Frame header, followed by data, followed by silence.
		 * There are two kinds of Frames: A Page Frame, and a Run Frame.
		 * - The Run Frame leaves the boot loader and runs the application.
		 * - A Page Frame loads a page of data to be burned to flash.
		 *
		 * A Frame header is 5 bytes: Command, Page Index (2bytes), CRC (2bytes)
		 * 
		 * Then the whole frame is Manchester Encoded with a sync sequence and a start bit.
		 */

		/* Some private functions for this */

		/**
		 * Append a block of silence
		 * At 44100, this is about 1/100th of a second.
		 */
		function appendSilence(signal) {
			for(var i=0; i < 441; i++) {
				signal.push(0);
			}
		}

		/**
		 * Appends a single Manchester encoded bit onto signal.
		 */
		function encodeEdge(edge, signal) {
			var val = edge?-1:1;
			signal.push( -val );
			signal.push( -val );
			signal.push( val );
			signal.push( val );
		}

		/**
		 * Encodes by Manchester and appends a frame to signal.
		 * Also adds a Start Sequence an Start bit for synchronising.
		 */
		function encodeFrame(frame, signal) {
			var i;

			/* Generate Start sequence */
			for(i=0; i < 40; i++) {
				encodeEdge(false, signal);
			}

			/* Generate start pulse */
			encodeEdge(true, signal);

			var d;
			for(i=0; i < frame.length; i++) {
				if( !(i in frame) || typeof frame[i] == 'undefined') {
					d = 0;
				} else {
					d = frame[i];
				}
				for(var j=0; j < 8; j++) {
					encodeEdge( ((d&0x80)!=0), signal);
					d = d << 1;
				}
			}

		}

		var signal = new Array();

		/* Convert data into Page Frames */
		for(var i=0; i < hexes.length;) {
			/* Skip over gaps. ?better way to do this? */
			if( !(i in hexes) ) {
				continue;
			}

			var pageIdx = i >> 7; /* Convert byte location to page index. */
			var frame = new Array();
			frame.push(2); // Program Page Command
			frame.push(pageIdx&0xff); // Page Index Lo.
			frame.push((pageIdx>>8)&0xff); // Page Index Hi.
			/* Not a true CRC. Is actually a Magic Number. Always 0x55AA */
			frame.push(0xaa); // CRC Lo.
			frame.push(0x55); // CRC Hi.
			for(var j=0; j < 128 ; j++, i++ ) {
				if( i in hexes ) {
					frame.push( hexes[i] );
				} else {
					frame.push( 0xff );
				}
			}
			encodeFrame(frame, signal);
			appendSilence(signal);

		}

		/* Append a Run Frame */
		var frame = new Array();
		frame.push(3); // Run Command
		frame.push(0); // Page Index Lo.
		frame.push(0); // Page Index Hi.
		/* Not a true CRC. Is actually a Magic Number. Always is 0x55AA */
		frame.push(0xaa); // CRC Lo.
		frame.push(0x55); // CRC Hi.
		for(var j=0; j < 128; j++) {
			frame.push(0);
		}
		encodeFrame(frame, signal);

		return signal;
	}

	/**
	 * Convert the hexes array into one of numbers.
	 */
	function hexesToNums(hexes) {
		var da = [];
		var spl = /(..)(..)/;
		var md;
		for(var i=0; i < hexes.length; i+=2) {
			/* skip over gaps */
			if( !(i in hexes) ) {
				continue;
			}
			md = hexes[i].match(spl);
			if(md == null) throw ("Not a string in hexes! at " + i);
			/* push right side first for little Endian */
			da[i] = parseInt(md[2], 16);
			da[i+1] = parseInt(md[1], 16);
		}
		return da;
	}

	/**
	 * Add a new output mode.
	 */
	tadAvrAsm.outModes.blinkit = function(state) {
		var da = hexesToNums(state.bytes);
		var sig = numsToSignal(da);
		return sig;
	}

	tadAvrAsm.doBlinks = function(div, sig, rate) {

		// - Needs a progress bar very badly.
		// - May need a format different than audioino.

		function blinker() {
			if(sig.length == 0) return;
			var v = sig.shift();
			if(v < 1) {
				div.style.backgroundColor = "black";
			} else {
				div.style.backgroundColor = "white";
			}
			setTimeout(function() {blinker()}, rate);
		}

		blinker();
	}

}( window.tadAvrAsm = window.tadAvrAsm || {} ));

/* vim: set cin sw=4 ts=4 noet : */
