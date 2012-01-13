
Avrian Jump
===========

A very simple ladder language for programming ATMega168s from a web browser.

This started out as a desire to be able to program an [Arduino][] from an iOS device.  Since it
doesn't seem like compiler tools of any sort would get into the app store, I figured something
would need to be done in HTML5.  And if a [PC emulator][psemu] could be written in javascript,
so could something like this.

However, recreating the Arduino IDE in HTML seemed like too much work. So the project was
reduced into something much simpler.  Mainly, a simple ladder language, and the Audioino
bootloader.  That still left the need for an assembler, which while still a fair amount of
work, seemed a lot more managable.  (and besides, it kind of sounded like fun to write an
assembler in javascript.)

The Ladder
----------

Each rung on the ladder has a single test and multiple actions.  Tests can check the digital
pins, analog pins, and a couple of variables.  Each action can set a digital pin, a PWM output,
or a variable.  Analog, PWM, and variables are 16bit values.

There is no 'setup()'.  Analog pins are always analog inputs.  When specified in a test, a
digital pin is set to an input then read.  When specified in an action, it is set to an output
then set.  ??? how does this interact with PWM ???

There is an ascii format of the ladders.  This was done because it seemed like it could be neat
to be able to tweet ladders.  You can view the ascii format, and also load ladders from it.
The ascii parser skips anything it doesn't recognise; it is a bit too forgiving at times.

An example program:
    #Fast Blink LED
    :T;A+=1
    :A=16383;D13=1
    :A=32767;D13=0,A=0

A ladder can also be turned into 8bit AVR assembly.

The Assembler
-------------

The assembler is pretty basic. Lots of features commonly found in other assemblers are
currently missing.  It does assemble the mneonics from [Atmel's pdf][avrasm] into machine code.
It supports labels, but not local labels.  It has simple parameter replacement, so common names
can be defined for IO registers and memory regions and things.  It can also specify where in
memory to put the machine code, and can specify immeadiate words to save in the machine code.

This assembler doesn't know about the various AVR devices, and so will happily assemble any of
the known mnemonics into the output.  Even if your target device has no idea what to do with
them.


Outputs
-------

A ladder can be turned into an ASCII form, assembler, a S19 file and an played as a WAV.  The
WAV file is formatted to be something the [Audioino][] bootloader recognises.  The S19 can be
feed into avrdude.  The assembly is mostly for debugging.  The ASCII format is for easy sharing
of ladders.


License
-------

Copyright (c) 2012 Michael Conrad Tadpol Tilstra
Licensed under the MIT License.


[Arduino]:http://www.arduino.cc/
[pcemu]:http://bellard.org/jslinux/
[avrasm]:http://www.atmel.com/atmel/acrobat/doc0856.pdf 
[Audioino]:http://www.hobby-roboter.de/forum/viewtopic.php?f=4&t=128&p=531

