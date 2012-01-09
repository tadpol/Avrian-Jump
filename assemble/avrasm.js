/**
 * Assemble AVR mnemonics into an S19 string.
 *
 * This was written with http://www.atmel.com/atmel/acrobat/doc0856.pdf 
 * It is a bit short of features often found in an assembler, but there is enough here to build
 * simple programs and run them.
 *
 * It would be nice someday to add device support, just to give errors on unsupported
 * instructions.  Macros would be nice too.
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
	 * Get a destination register index from a string and shift it to where it
	 * is most commonly found.
	 * Also, make sure it is within the valid range.
	 */
	function destRindex(r, min, max) {
		min = (typeof min == 'undefined')?0:min;
		max = (typeof max == 'undefined')?31:max;
		var d = r.match(/[Rr](\d{1,2})/);
		if(!d) throw("Not a register: " + r);
		d = parseInt(d[1]);
		if( d < min || d > max) throw ("Rd out of range: " + min + "<>" + max);
		return (d & 0x1f) << 4
	}

	/**
	 * Get a source register index from a string and shift it to where it is
	 * most commonly found.
	 * Also, make sure it is within the valid range.
	 */
	function srcRindex(r, min, max) {
		min = (typeof min == 'undefined')?0:min;
		max = (typeof max == 'undefined')?31:max;
		var d = r.match(/[Rr](\d{1,2})/);
		if(!d) throw("Not a register: " + r);
		d = parseInt(d[1]);
		if( d < min || d > max) throw ("Rd out of range: " + min + "<>" + max);
		var s = (d & 0xf);
		s |= ((d>>4) & 1) << 9;
		return s;
	}

	/**
	 * Get a constant value and check that it is in range.
	 */
	function constValue(r, min, max) {
		min = (typeof min == 'undefined')?0:min;
		max = (typeof max == 'undefined')?255:max;
		var d = parseInt(r);
		if( isNaN(d) ) throw "constant is not a number.";
		if( d < min || d > max) throw ("[Ks] out of range: " + min + "<>" + max);
		return d;
	}

	/*
	 * Fit a twos-complement number into the specific bit count
	 */
	function fitTwoC(r, bits) {
		if(bits < 2) throw "Need atleast 2 bits to be signed.";
		if(bits > 16) throw "fitTwoC only works on 16bit numbers for now.";
		if(Math.abs(r) > Math.pow(2, bits-1)) throw ("Not enough bits for number. (" + r + ", " + bits + ")");
		if( r < 0) {
			r = 0xffff + r + 1;
		}
		var mask = 0xffff >> (16 - bits);
		return r & mask;
	}

	/**
	 * Determin if input is an address or label and lookup if required.
	 * If label that doesn't exist, return NaN.
	 * If offset is not 0, convert from absolute address to relative.
	 */
	function constOrLabel(c, labels, offset) {
		offset = (typeof offset == 'undefined')?0:offset;
		if( typeof c == 'string' ) {
			var d = parseInt(c);
			if( isNaN(d) ) {
				if( c in labels ) {
					d = labels[c] - offset;
					d = d >> 1; /* convert bytes into words. */
				} else {
					return NaN;
				}
			}
			c = d;
		}
		return c;
	}

	/**
	 * Convert number to hex and left pad it
	 */
	function zeroPad(r, len) {
		len = (typeof len == 'undefined')?4:len; // default to words.
		r = Number(r).toString(16);
		var base = Array(len+1).join('0');
		var t = base.substr(0, len - r.length) + r;
		return t;
	}

	/**
	 * Get an Indirect Address Register and shift it to where it is commonly found.
	 */
	function stldXYZ(xyz) {
		switch(xyz) {
			case 'X':
				return 0x900c;
			case 'X+':
				return 0x900d;
			case '-X':
				return 0x900e;
			case 'Y':
				return 0x8008;
			case 'Y+':
				return 0x9009;
			case '-Y':
				return 0x900a;
			case 'Z':
				return 0x8000;
			case 'Z+':
				return 0x9001;
			case '-Z':
				return 0x9002;
			default:
				throw "Not -?[XYZ]\\+?";
		}
	}

	/**
	 * Get an Indirect Address Register with displacement and shift it to where it is commonly found.
	 */
	function stldYZq(yzq) {
		var d = yzq.match(/([YZ])\+(\d+)/);
		var r = 0x8000;
		switch(d[1]) {
			case 'Y':
				r |= 0x8;
				break;
			case 'Z':
				/* r|= 0; */
				break;
			default:
				throw "Not Y or Z with q";
		}
		var q = parseInt(d[2]);
		if( q < 0 || q > 64 ) throw "q is out of range";
		r |= ((q & 0x20) << 8) | ((q & 0x18) << 7) | (q & 0x7);
		return r;
	}

	/**
	 * Table of Mnemonics that can be assembled.
	 */
	var OPTABLE = {
		/* Mnemonic: linecompiler */
		"ADD": function(a,b) {
			var r = 0x0c00 | destRindex(a) | srcRindex(b);
			return zeroPad(r);
		},
		"ADC": function(a,b) {
			var r = 0x1c00 | destRindex(a) | srcRindex(b);
			return zeroPad(r);
		},
		"ADIW": function(a,b) { 
			var r = 0x9600;
			var dm = a.match(/[Rr](24|26|28|30)/);
			if( !dm ) throw "Rd must be 24, 26, 28, or 30";
			var d = parseInt(dm[1]);
			d = (d - 24) / 2;
			r |= (d & 0x3) << 4;
			var k = constValue(b, 0, 63);
			r |= ((k & 0x30) << 2) | (k & 0x0f);
			return zeroPad(r);
		},
		"AND": function(a,b) {
			var r = 0x2000 | destRindex(a) | srcRindex(b);
			return zeroPad(r);
		},
		"ANDI": function(a,b) {
			var r = 0x7000 | (destRindex(a, 16, 31) & 0xf0);
			var k = constValue(b);
			r |= ((k & 0xf0) << 4) | (k & 0xf);
			return zeroPad(r);
		},
		"ASR": function(a,b) {
			var r = 0x9405 | destRindex(a);
			return zeroPad(r);
		},
		"BCLR": function(a,b) {
			var r = 0x9488;
			var s = constValue(a, 0, 7);
			r |= (s & 0x7) << 4;
			return zeroPad(r);
		},
		"BLD": function(a,b) {
			var r = 0xf800 | destRindex(a) | (constValue(b, 0, 7) & 0x7);
			return zeroPad(r);
		},
		"BRBC": function(a, b, byteLoc, labels) {
			var k = constOrLabel(b, labels, byteLoc + 2);
			if( isNaN(k) ) {
				return function(l) {return OPTABLE["BRBC"](a, b, byteLoc, l);};
			}
			var r = 0xf400 | constValue(a, 0, 7);
			r |= (fitTwoC(constValue(k, -64, 63), 7) << 3);
			return zeroPad(r);
		},
		"BRBS": function(a, b, byteLoc, labels) {
			var k = constOrLabel(b, labels, byteLoc + 2);
			if( isNaN(k) ) {
				return function(l) {return OPTABLE["BRBS"](a, b, byteLoc, l);};
			}
			var r = 0xf000 | constValue(a, 0, 7);
			r |= (fitTwoC(constValue(k, -64, 63), 7) << 3);
			return zeroPad(r);
		},
		"BRCC": function(a,b, byteLoc, labels) {
			return OPTABLE["BRBC"](0, a, byteLoc, labels);
		},
		"BRCS": function(a, b, byteLoc, labels) {
			return OPTABLE["BRBS"](0, a, byteLoc, labels);
		},
		"BREAK": function() {
			return "9598";
		},
		"BREQ": function(a, b, byteLoc, labels) {
			return OPTABLE["BRBS"](1, a, byteLoc, labels);
		},
		"BRGE": function(a, b, byteLoc, labels) {
			return OPTABLE["BRBC"](4, a, byteLoc, labels);
		},
		"BRHC": function(a, b, byteLoc, labels) {
			return OPTABLE["BRBC"](5, a, byteLoc, labels);
		},
		"BRHS": function(a, b, byteLoc, labels) {
			return OPTABLE["BRBS"](5, a, byteLoc, labels);
		},
		"BRID": function(a, b, byteLoc, labels) {
			return OPTABLE["BRBC"](7, a, byteLoc, labels);
		},
		"BRIE": function(a, b, byteLoc, labels) {
			return OPTABLE["BRBS"](7, a, byteLoc, labels);
		},
		"BRLO": function(a, b, byteLoc, labels) {
			return OPTABLE["BRBS"](0, a, byteLoc, labels);
		},
		"BRLT": function(a, b, byteLoc, labels) {
			return OPTABLE["BRBS"](4, a, byteLoc, labels);
		},
		"BRMI": function(a, b, byteLoc, labels) {
			return OPTABLE["BRBS"](2, a, byteLoc, labels);
		},
		"BRNE": function(a, b, byteLoc, labels) {
			return OPTABLE["BRBC"](1, a, byteLoc, labels);
		},
		"BRPL": function(a, b, byteLoc, labels) {
			return OPTABLE["BRBC"](2, a, byteLoc, labels);
		},
		"BRSH": function(a, b, byteLoc, labels) {
			return OPTABLE["BRBC"](0, a, byteLoc, labels);
		},
		"BRTC": function(a, b, byteLoc, labels) {
			return OPTABLE["BRBC"](6, a, byteLoc, labels);
		},
		"BRTS": function(a, b, byteLoc, labels) {
			return OPTABLE["BRBS"](6, a, byteLoc, labels);
		},
		"BRVC": function(a, b, byteLoc, labels) {
			return OPTABLE["BRBC"](3, a, byteLoc, labels);
		},
		"BRVS": function(a, b, byteLoc, labels) {
			return OPTABLE["BRBS"](3, a, byteLoc, labels);
		},
		"BSET": function(a, b) {
			var r = 0x9408;
			var s = constValue(a, 0, 7);
			r |= (s & 0x7) << 4;
			return zeroPad(r);
		},
		"BST": function(a, b) {
			var r = 0xfa00 | destRindex(a) | constValue(b, 0, 7);
			return zeroPad(r);
		},
		"CALL": function(a, b, byteLoc, labels) {
			var k = constOrLabel(a, labels);
			if( isNaN(k) ) {
				return [function(l) {return OPTABLE["CALL"](a, b, byteLoc, l);}, "xxxx"];
			}
			var r = 0x940e;
			k = constValue(k, 0, 0x400000);
			var lk = k & 0xffff;
			var hk = (k >> 16) & 0x3f;
			r |= ((hk & 0x3e) << 3) | (hk & 1);
			return [zeroPad(r), zeroPad(lk)];
		},
		"CBI": function(a, b) {
			var r = 0x9800 | (constValue(a, 0, 31) << 3) | constValue(b, 0, 7);
			return zeroPad(r);
		},
		"CRB": function(a, b) {
			var k = constValue(b);
			return OPTABLE["ANDI"](a, (~k)&0xff );
		},
		"CLC" : function() {
			return "9488";
		},
		"CLH" : function() {
			return "94d8";
		},
		"CLI" : function() {
			return "94f8";
		},
		"CLN" : function() {
			return "94a8";
		},
		"CLR": function(a) {
			return OPTABLE["EOR"](a, a);
		},
		"CLS" : function() {
			return "94c8";
		},
		"CLT" : function() {
			return "94e8";
		},
		"CLV" : function() {
			return "94b8";
		},
		"CLZ" : function() {
			return "9498";
		},
		"COM": function(a) {
			var r = 0x9400 | destRindex(a);
			return zeroPad(r);
		},
		"CP": function(a, b) {
			var r = 0x1400 | destRindex(a) | srcRindex(b);
			return zeroPad(r);
		},
		"CPC": function(a, b) {
			var r = 0x0400 | destRindex(a) | srcRindex(b);
			return zeroPad(r);
		},
		"CPI": function(a, b) {
			var r = 0x3000 | (destRindex(a, 16, 31) & 0xf0);
			var k = constValue(b);
			r |= ((k & 0xf0) << 4) | (k & 0xf);
			return zeroPad(r);
		},
		"CPSE": function(a, b) {
			var r = 0x1000 | destRindex(a) | srcRindex(b);
			return zeroPad(r);
		},
		"DEC": function(a) {
			var r = 0x940a | destRindex(a);
			return zeroPad(r);
		},
		"DES": function(a) {
			var r = 0x940b | (constValue(a, 0, 15) << 4);
			return zeroPad(r);
		},
		"EICALL": function() {
			return "9519";
		},
		"EIJMP": function() {
			return "9419";
		},
		"ELPM": function(a, b) {
			if( typeof a == 'undefined' || a == '' ) {
				return "95d8";
			} else {
				var r = 0x9000 | destRindex(a);
				switch(b) {
					case 'Z':
						r |= 6;
						break;
					case 'Z+':
						r |= 7;
						break;
					default:
						throw "Bad operand";
				}
				return zeroPad(r);
			}
		},
		"EOR": function(a, b) {
			var r = 0x2400 | destRindex(a) | srcRindex(b);
			return zeroPad(r);
		},
		"FMUL": function(a, b) {
			var r = 0x0308 | (destRindex(a, 16, 23) & 0x70) | (srcRindex(b, 16, 23) & 0x7);
			return zeroPad(r);
		},
		"FMULS": function(a, b) {
			var r = 0x0380 | (destRindex(a, 16, 23) & 0x70) | (srcRindex(b, 16, 23) & 0x7);
			return zeroPad(r);
		},
		"FMULSU": function(a, b) {
			var r = 0x0388 | (destRindex(a, 16, 23) & 0x70) | (srcRindex(b, 16, 23) & 0x7);
			return zeroPad(r);
		},
		"ICALL": function() {
			return "9509";
		},
		"IJMP": function() {
			return "9409";
		},
		"IN": function(a, b) {
			var r = 0xb000 | destRindex(a);
			var A  = constValue(b, 0, 63);
			r |= ((A & 0x30) << 5) | ( A & 0x0f);
			return zeroPad(r);
		},
		"INC": function(a) {
			var r = 0x9403 | destRindex(a);
			return zeroPad(r);
		},
		"JMP": function(a, b, byteLoc, labels) {
			var k = constOrLabel(a, labels);
			if( isNaN(k) ) {
				return [function(l) {return OPTABLE["JMP"](a, b, byteLoc, l);}, "xxxx"];
			}
			var r = 0x940c;
			k = constValue(k, 0, 0x400000);
			var lk = k & 0xffff;
			var hk = (k >> 16) & 0x3f;
			r |= ((hk & 0x3e) << 3) | (hk & 1);
			return [zeroPad(r), zeroPad(lk)];
		},
		"LAC": function(a, b) {
			if(a != 'Z') throw "First Operand is not Z";
			var r = 0x9206 | destRindex(b);
			return zeroPad(r);
		},
		"LAS": function(a, b) {
			if(a != 'Z') throw "First Operand is not Z";
			var r = 0x9205 | destRindex(b);
			return zeroPad(r);
		},
		"LAT": function(a, b) {
			if(a != 'Z') throw "First Operand is not Z";
			var r = 0x9207 | destRindex(b);
			return zeroPad(r);
		},
		"LD": function(a, b) {
			var r = 0x0000 | destRindex(a) | stldXYZ(b);
			return zeroPad(r);
		},
		"LDD": function(a, b) {
			var r = 0x0000 | destRindex(a) | stldYZq(b);
			return zeroPad(r);
		},
		"LDI": function(a,b) {
			var r = 0xe000 | (destRindex(a, 16, 31) & 0xf0);
			var k = constValue(b);
			r |= ((k & 0xf0) << 4) | (k & 0xf);
			return zeroPad(r);
		},
		"LDS": function(a, b) {
			var k = constValue(b, 0, 65535);
			var r = 0x9000 | destRindex(a);
			return [zeroPad(r), zeroPad(k)];
		},
		"LPM": function(a, b) {
			if( typeof a == 'undefined' || a == '' ) {
				return "95c8";
			} else {
				var r = 0x9000 | destRindex(a);
				switch(b) {
					case 'Z':
						r |= 4;
						break;
					case 'Z+':
						r |= 5;
						break;
					default:
						throw "Bad operand";
				}
				return zeroPad(r);
			}
		},
		"LSL": function(a) {
			return OPTABLE["ADD"](a, a);
		},
		"LSR": function(a) {
			var r = 0x9406 | destRindex(a);
			return zeroPad(r);
		},
		"MOV": function(a, b) {
			var r = 0x2c00 | destRindex(a) | srcRindex(b);
			return zeroPad(r);
		},
		"MOVW": function(a, b) {
			/* use destRindex on both here for simpler shifting */
			var r = 0x0100 | ((destRindex(a) >> 1) & 0xf0) | ((destRindex(b) >> 5) & 0xf);
			return zeroPad(r);
		},
		"MUL": function(a, b) {
			var r = 0x9c00 | destRindex(a) | srcRindex(b);
			return zeroPad(r);
		},
		"MULS": function(a, b) {
			var r = 0x0200 | (destRindex(a, 16, 31) & 0xf0) | (srcRindex(b, 16, 31) & 0xf);
			return zeroPad(r);
		},
		"MULSU": function(a, b) {
			var r = 0x0300 | (destRindex(a, 16, 23) & 0x70) | (srcRindex(b, 16, 23) & 0x7);
			return zeroPad(r);
		},
		"NEG": function(a) {
			var r = 0x9401 | destRindex(a);
			return zeroPad(r);
		},
		"NOP": function() {
			return "0000";
		},
		"OR": function(a, b) {
			var r = 0x2800 | destRindex(a) | srcRindex(b);
			return zeroPad(r);
		},
		"ORI": function(a, b) {
			var r = 0x6000 | (destRindex(a, 16, 31) & 0xf0);
			var k = constValue(b);
			r |= ((k & 0xf0) << 4) | (k & 0xf);
			return zeroPad(r);
		},
		"OUT": function(a, b) {
			var r = 0xb800 | destRindex(b);
			var A  = constValue(a, 0, 63);
			r |= ((A & 0x30) << 5) | ( A & 0x0f);
			return zeroPad(r);
		},
		"POP": function(a) {
			var r = 0x900f | destRindex(a);
			return zeroPad(r);
		},
		"PUSH": function(a) {
			var r = 0x920f | destRindex(a);
			return zeroPad(r);
		},
		"RCALL": function(a, b, byteLoc, labels) {
			var k = constOrLabel(a, labels, byteLoc + 2);
			if( isNaN(k) ) {
				return function(l) {return OPTABLE["RCALL"](a, b, byteLoc, l);};
			}
			var r = 0xd000 | fitTwoC(constValue(k, -2048, 2048), 12);
			return zeroPad(r);
		},
		"RET": function() {
			return "9508";
		},
		"RETI": function() {
			return "9518";
		},
		"RJMP": function(a, b, byteLoc, labels) {
			var k = constOrLabel(a, labels, byteLoc + 2);
			if( isNaN(k) ) {
				return function(l) {return OPTABLE["RJMP"](a, b, byteLoc, l);};
			}
			var r = 0xc000 | fitTwoC(constValue(k, -2048, 2048), 12);
			return zeroPad(r);
		},
		"ROL": function(a) {
			return OPTABLE["ADC"](a, a);
		},
		"ROR": function(a) {
			var r = 0x9407 | destRindex(a);
			return zeroPad(r);
		},
		"SBC": function(a,b) {
			var r = 0x0800 | destRindex(a) | srcRindex(b);
			return zeroPad(r);
		},
		"SBCI": function(a, b) {
			var r = 0x4000 | (destRindex(a, 16, 31) & 0xf0);
			var k = constValue(b);
			r |= ((k & 0xf0) << 4) | (k & 0x0f);
			return zeroPad(r);
		},
		"SBI": function(a, b) {
			var r = 0x9a00 | (constValue(a, 0, 31) << 3) | constValue(b, 0, 7);
			return zeroPad(r);
		},
		"SBIC": function(a, b) {
			var r = 0x9900 | (constValue(a, 0, 31) << 3) | constValue(b, 0, 7);
			return zeroPad(r);
		},
		"SBIS": function(a, b) {
			var r = 0x9b00 | (constValue(a, 0, 31) << 3) | constValue(b, 0, 7);
			return zeroPad(r);
		},
		"SBIW": function(a, b) {
			var r = 0x9700;
			var dm = a.match(/[Rr](24|26|28|30)/);
			if( !dm ) throw "Rd must be 24, 26, 28, or 30";
			var d = parseInt(dm[1]);
			d = (d - 24) / 2;
			r |= (d & 0x3) << 4;
			var k = constValue(b, 0, 63);
			r |= ((k & 0x30) << 2) | (k & 0x0f);
			return zeroPad(r);
		},
		"SBR": function(a, b) {
			var r = 0x6000 | (destRindex(a, 16, 31) & 0xf0);
			var k = constValue(b);
			r |= ((k & 0xf0) << 4) | (k & 0x0f);
			return zeroPad(r);
		},
		"SBRC": function(a, b) {
			var r = 0xfc00 | destRindex(a) | constValue(b, 0, 7);
			return zeroPad(r);
		},
		"SBRS": function(a, b) {
			var r = 0xfe00 | destRindex(a) | constValue(b, 0, 7);
			return zeroPad(r);
		},
		"SEC": function() {
			return OPTABLE["SEflag"](0);
		},
		"SEflag": function(a) { /* set flag a */
			var r = 0x9408 | (constValue(a, 0, 7) << 4);
			return zeroPad(r);
		},
		"SEH": function() {
			return OPTABLE["SEflag"](5);
		},
		"SEI": function() {
			return OPTABLE["SEflag"](7);
		},
		"SEN": function() {
			return OPTABLE["SEflag"](2);
		},
		"SER": function(a) {
			var r = 0xef0f | (destRindex(a, 16, 31) & 0xf0);
			return zeroPad(r);
		},
		"SES": function() {
			return OPTABLE["SEflag"](4);
		},
		"SET": function() {
			return OPTABLE["SEflag"](6);
		},
		"SEV": function() {
			return OPTABLE["SEflag"](3);
		},
		"SEZ": function() {
			return OPTABLE["SEflag"](1);
		},
		"SLEEP": function() {
			return "9588";
		},
		"SPM": function(a) {
			if( typeof a == 'undefined' || a == '' ) {
				return "95e8";
			} else {
				if( a != 'Z+' ) throw "Bad param to SPM";
				return "95f8";
			}
		},
		"ST": function(a, b) {
			var r = 0x0200 | destRindex(b) | stldXYZ(a);
			return zeroPad(r);
		},
		"STD": function(a, b) {
			var r = 0x0200 | destRindex(b) | stldYZq(a);
			return zeroPad(r);
		},
		"STS": function(a, b) {
			var k = constValue(a, 0, 65535);
			var r = 0x9200 | destRindex(b);
			return [zeroPad(r), zeroPad(k)];
		},
		"SUB": function(a, b) {
			var r = 0x1800 | destRindex(a) | srcRindex(b);
			return zeroPad(r);
		},
		"SUBI": function(a, b) {
			var r = 0x5000 | (destRindex(a, 16, 31) & 0xf0);
			var k = constValue(b);
			r |= ((k & 0xf0) << 4) | (k & 0xf);
			return zeroPad(r);
		},
		"SWAP": function(a) {
			var r = 0x9402 | destRindex(a);
			return zeroPad(r);
		},
		"TST": function(a) {
			return OPTABLE["AND"](a, a);
		},
		"WDR": function() {
			return "95a8";
		},
		"XCH": function(a, b) {
			var r = 0x9204 | destRindex(b);
			if( a != 'Z' ) throw "Bad param, not Z";
			return zeroPad(r);
		}
	}

	function passone(inputdata) {
		var lines = inputdata.split("\n");
		var commentReg = /[#;].*$/;
		var labelReg = /^(\w+):/;
		var codeReg = /^\s*(\w+)(?:\s+([^,]+)(?:,\s*(\S+))?)?\s*$/;
		var lt;
		var res;
		var rets;
		var mnemonic;

		var byteOffset = 0;
		var lableTable = {};
		var replacements = {};
		var errorTable = new Array();
		var lineTable = new Array();

		for(var idx = 0; idx < lines.length; idx++) {
			res = lines[idx].trim();
			if( res.length == 0 ) continue;
			lt = {'line': idx+1, 'text': res, 'bytes':[], 'byteOffset':0};
			res = res.replace(commentReg, "").trim(); /* strip off comments. */
			if( res.length == 0 ) continue;
			/* check for a label */
			rets = res.match(labelReg);
			if( rets ) {
				lableTable[ rets[1] ] = byteOffset;
				res = res.replace(labelReg, '').trim(); /* strip out label. */
			}
			if( res.length == 0 ) continue;
			/* Check for a mnemonic line */
			res = res.match(codeReg);
			try {
				if( res == null ) {
					throw("doesn't match as code!");
				}
				
				if( ! res[1] ) {
					throw "Empty mnemonic field!";
				}

				/* do opcode */
				mnemonic = res[1].toUpperCase().trim();
				/* This switch is ok for just these three.
				 * If ever to add more, then need to figure out how to merge all of the 
				 * mnemonics into the OPTABLE. (or build a seperate internal op table)
				 */
				switch(mnemonic) {
					case '_REPLACE':
						replacements[ res[2] ] = res[3];
						continue;
					case '_LOC':
						var num = parseInt(res[2]);
						if(isNaN(num)) {
							throw "Location is not a number.";
						}
						if(num&0x1) {
							throw "Location is odd";
						}
						byteOffset = num;
						continue;
					case '_IW':
						var num = parseInt(res[2]);
						if(isNaN(num)) {
							throw "Immeadiate Word is not a number.";
						}
						lt.bytes = zeroPad(num);
						lt.byteOffset = byteOffset;
						byteOffset += 2;
						continue;
				}

				if( ! (mnemonic in OPTABLE) ) {
					throw "No such mnemonic: " + mnemonic;
				}

				/* do replacements on parameters. */
				if( res[2] in replacements ) {
					res[2] = replacements[res[2]];
				}
				if( res[3] in replacements ) {
					res[3] = replacements[res[3]];
				}

				rets = OPTABLE[mnemonic]( res[2], res[3], byteOffset, lableTable );
				lt.byteOffset = byteOffset;
				switch(typeof rets) {
					case 'function':
					case 'string':
						byteOffset += 2;
						break;
					case 'object': /* assumed as an array. */
						byteOffset += rets.length * 2;
						break;
					default:
						throw "unknown return type from optable.";
				}
				lt.bytes = rets;
				lineTable.push(lt);
			} catch (err) {
				errorTable.push( "Line " + idx + ": " + err );
			}

		}

		return {
			"labels": lableTable,
			"errors": errorTable,
			'lines':lineTable
		};
	}

	/**
	 * Handle any forward referenced labels that were deferred in passone.
	 */
	function passtwo(lineTable, labels) {
		var errorTable = new Array();
		var resultTable = new Array();
		var rets;
		for(var idx=0; idx < lineTable.length; idx++) {
			try {
				/* Look for functions left over from passone. */
				if( typeof lineTable[idx].bytes == 'function' ) {
					lineTable[idx].bytes = lineTable[idx].bytes(labels);
				}
				if( typeof lineTable[idx].bytes == 'object' &&
					lineTable[idx].bytes.length >= 1 && 
					typeof lineTable[idx].bytes[0] == 'function' ) { /* a bit gross. FIXME */
					lineTable[idx].bytes = lineTable[idx].bytes[0](labels);
				}

				/* copy bytes out of linetable into the results. */
				switch( typeof lineTable[idx].bytes ) {
					case 'string':
						resultTable[ lineTable[idx].byteOffset ] = lineTable[idx].bytes;
						break;
					case 'object': /* also array. */
						if( lineTable[idx].bytes.length < 1 ) {
							throw "Empty array in lineTable."
						}
						var bi = lineTable[idx].byteOffset;
						for(var j=0; j < lineTable[idx].bytes.length; j++, bi+=2) {
							if( typeof lineTable[idx].bytes[j] != 'string' ) {
								throw "Not an array of strings.";
							}
							resultTable[ bi ] = lineTable[idx].bytes[j];
						}
						break;
					default:
						throw "unknown return type from optable.";
				}
			} catch(err) {
				errorTable.push( "Line: " + lineTable[idx].line  + ": " + err );
			}
		}
		return { "errors": errorTable, "bytes":resultTable, 'lines': lineTable};
	}

	/**
	 * Convert array of 8bit hex strings into S19 data.
	 */
	function hexesToS19(hexes) {
		var ret = new Array();

		ret.push("S0030000FC\n");

		var len;
		var checksum;
		for(var iidx=0; iidx < hexes.length; ) {
			/* Skip over gaps. ?better way to do this? */
			if( !(iidx in hexes) ) {
				iidx++;
				continue;
			}

			/* 1 for checksum, 4 for address */
			len = (hexes.length - iidx) + 5;
			if(len > 33)
				len = 33;

			ret.push('S3');
			ret.push( zeroPad(len, 2) );
			ret.push( zeroPad(iidx, 8) );
			checksum = len;

			checksum = (((iidx >> 24) & 0xff) + checksum) & 0xff;
			checksum = (((iidx >> 16) & 0xff) + checksum) & 0xff;
			checksum = (((iidx >> 8) & 0xff) + checksum) & 0xff;
			checksum = ((iidx & 0xff) + checksum) & 0xff;
			len -= 5; /* 1 for checksum, 4 for address */

			for(;len > 0 && iidx < hexes.length; iidx++, len--) {
				if( !(iidx in hexes) ) break; /* if we hit a gap, stop this line */
				ret.push( hexes[iidx] );
				checksum = (parseInt(hexes[iidx], 16) + checksum) & 0xff;
			}
			ret.push( zeroPad((~checksum)&0xff, 2) );
			ret.push("\n");
		}

		/* S19 end */
		ret.push("S9030000FC\n");

		return ret.join('');
	}

	/**
	 * Covert gappy array of 16bits to less gappy array of 8bits.
	 * 
	 * Large gaps are still present.
	 *
	 * Likely the wrong way to do things.
	 */
	function hexesToEights(hexes) {
		var ret = new Array();
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
			ret[i] = md[2];
			ret[i+1] = md[1];
		}
		return ret;
	}

	/**
	 * Given a string that is the hex of a uint16, swap the bytes.
	 *
	 * That is, change ABCD into CDAB
	 */
	function stringByteSwap(str) {
		var m = str.match(/(..)(..)/);
		if(!m) throw "Cannot swap this.";
		return m[2] + m[1];
	}

	/**
	 * Dump out the assembed data with line numbers and what was assemebled at each line.
	 *
	 * This output is very similar to what 'gcc-avr-as -mall-opcodes -al' produces.
	 * The intent is that we can validate this assemble against gcc-avr-as with a diff tool.
	 * See also the buildCompareTable.sh script.
	 */
	function toListing(lt) {
		output = new Array();
		for(var idx=0;idx < lt.length; idx++) {
			var s = new Array();
			var pad='    ';
			var l = lt[idx].line.toString();
			s.push( pad.substr(0, 4 - l.length) + l );
			s.push(" ");
			s.push( zeroPad(lt[idx].byteOffset) );
			s.push(" ");
			switch( typeof lt[idx].bytes ) {
				case 'string':
					s.push( stringByteSwap(lt[idx].bytes).toUpperCase() );
					s.push('     ');
					break;
				case 'object':
					for(var j=0;j < lt[idx].bytes.length; j++) {
						s.push( stringByteSwap(lt[idx].bytes[j]).toUpperCase() );
						s.push(' ');
					}
					break;
				default:
					throw ("Bogus byte type from line: " + lt[idx].line);
			}
			s.push( "\t");
			s.push( lt[idx].text.replace(/\t/g,' ').replace(/,\s+/,',') );
			output.push(s.join(''));
		}
		return output.join("\n");
	}

	tadAvrAsm.outModes = {};
	tadAvrAsm.outModes.s19 = function(state) {
		return hexesToS19( hexesToEights( state.bytes ) );
	}
	tadAvrAsm.outModes.list = function(state) {
		return toListing(state.lines);
	}

	/**
	 * The assembler.
	 */
	tadAvrAsm.assemble = function(input, options) {
		try {
			var mid = passone(input);
			if( mid.errors.length > 0 ) {
				return {"errors": mid.errors};
			}
			var end = passtwo(mid.lines, mid.labels);
			if( end.errors.length > 0 ) {
				return {"errors": end.errors};
			}
			mid=null;

			var output;
			if( typeof options == 'undefined' ) {
				options = {};
				options['outmode'] = 's19';
			}
			if( ! ('outmode' in options) ) {
				options['outmode'] = 's19';
			}
			if( options.outmode in tadAvrAsm.outModes ) {
				output = tadAvrAsm.outModes[options.outmode](end);
			} else {
				output = tadAvrAsm.outModes.s19(end);
			}

			return {"data":output};
		} catch(err) {
			return {"errors":[err]};
		}
	}

}( window.tadAvrAsm = window.tadAvrAsm || {} ));

/* vim: set cin sw=4 ts=4 noet : */
