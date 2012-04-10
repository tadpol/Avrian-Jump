
Avrian Jump
===========

A very simple ladder language for programming ATMega168s from a web browser.

This started out as a desire to be able to program an [Arduino][] from an iOS device.  Since it
doesn't seem like compiler tools of any sort would get into the app store, I figured something
would need to be done in HTML5.  And if a [PC emulator][pcemu] could be written in javascript,
so could something like this.

However, recreating the Arduino IDE in HTML seemed like too much work, at least for a first
try.  So I reduced the project into something much simpler, while still putting real machine
code into the AVR's flash.  A simple ladder language that compiled into AVR assembly, which
would be assembled into machine code, seemed like like a resonable reduction.  With that I
could take advantage of the [Audioino][] bootloader, to load right from the web page.

This is still unfinished, go see the TODO file.

Also go read issue #2, playing sounds encoded in data URIs in iOS 5.1 is broken. *sigh*

Try it out! [Avrian Jump](http://tadpol.github.com/Avrian-Jump/avrianjump.html)

The Ladder
----------

Each rung on the ladder has a single test and multiple actions.  Tests can check the digital
pins, analog pins, and a couple of variables.  Each action can set a digital pin, a PWM output,
or a variable.  Analog, PWM, and variables are 16bit values.

There is no 'setup()'.  Analog pins are always analog inputs.  When specified in a test, a
digital pin is set to an input then read.  When specified in an action, it is set to an output
then set.

PWM code is still non-existant, so how this will actually work is up in the air.  How I want it
to work is:  Specifying a pin in an action as a PWM output makes it a PWM output.  Specifying a
pin in a test stops it from doing PWM output.  Specifying a digital state for the pin in an
action also stops it from doing PWM output.

There is an ascii format of the ladders.  This was done because it seemed like it could be neat
to be able to tweet ladders.  You can view the ascii format, and also load ladders from it.
The ascii parser skips anything it doesn't recognise; it is a bit too forgiving at times.

An example program:

	#Fast Blink LED
	:T;A+=1
	:A=16383;D13=1
	:A=32767;D13=0,A=0

Mostly though, a ladder is converted into AVR assembly.

The Assembler
-------------

The assembler is pretty basic. Lots of features commonly found in other assemblers are
currently missing.  It does assemble the mneonics from [Atmel's pdf][avrasm] into machine code.
It supports labels, but not local labels.  It has simple parameter replacement, so common names
can be defined for IO registers and memory regions and things.  It can also specify where in
memory to put the machine code, and can specify immeadiate words to save in the machine code.

This assembler doesn't know about the various AVR devices, and so will happily assemble any of
the known mnemonics into the output.  Even if your target device has no idea what to do with
them.  It has assembled blink tests for the ATmega168 and the ATTiny13, so it seems pretty
flexable. (Avrian Jump currently only supports the ATmega168 though.  Maybe add others in the
future, but would have to figure the bootloader thing out first.)


Outputs
-------

A ladder can be compiled into a few different formats:

- ASCII
  - This the only form can can be converted back into a ladder.
	- This is for sharing your ladder with others, or saving a ladder for later.
- S19
  - If you don't have an [Audioino][] bootloader, but still want to use a ladder.  A S19 can be
		saved as a file, and loaded with [avrdude][].
- WAV
  - A [Audioino][] compatible wav file for loading the ladder onto an ATmega168 with the
		[Audioino][] bootloader installed.
- Assembler
  - This is mostly around for debugging the ladder compiler.  It can be interesting to look at
		too.


License
-------

Copyright (c) 2012 Michael Conrad Tadpol Tilstra

Licensed under the MIT License.


[Arduino]:http://www.arduino.cc/
[pcemu]:http://bellard.org/jslinux/
[avrasm]:http://www.atmel.com/atmel/acrobat/doc0856.pdf
[avrdude]:http://ladyada.net/learn/avr/avrdude.html
[Audioino]:http://www.hobby-roboter.de/forum/viewtopic.php?f=4&t=128&p=531

