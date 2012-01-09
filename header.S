
; Replace common IO register names with numbers for a ATmega168
	_replace PINB, 0x03
	_replace DDRB, 0x04
	_replace PORTB, 0x05
	_replace PINC, 0x06
	_replace DDRC, 0x07
	_replace PORTC, 0x08
	_replace PIND, 0x09
	_replace DDRD, 0x0a
	_replace PORTD, 0x0b

	_replace ADCL, 0x78
	_replace ADCH, 0x79
	_replace ADCSRA, 0x7a
	_replace ADCSRB, 0x7b
	_replace ADMUX, 0x7c
	_replace DIDR0, 0x7e

	_replace SPH, 0x3e
	_replace SPL, 0x3d
	_replace RAMEND_HI, 0x04
	_replace RAMEND_LO, 0xff

; Rest and Interrupt table for ATmega168
	_loc 0
	jmp RESET		; Reset Handler
	jmp IgnoreINT		; IRQ0 Handler
	jmp IgnoreINT		; IRQ1 Handler
	jmp IgnoreINT		; PCINT0 Handler
	jmp IgnoreINT		; PCINT1 Handler
	jmp IgnoreINT		; PCINT2 Handler
	jmp IgnoreINT		; Watchdog Timer
	jmp IgnoreINT		; Timer2 Compare
	jmp IgnoreINT		; Timer2 Compare
	jmp IgnoreINT		; Timer2 Overflow Handler
	jmp IgnoreINT		; Timer1 Capture Handler
	jmp IgnoreINT		; Timer1 Compare A Handler
	jmp IgnoreINT		; Timer1 Compare B Handler
	jmp IgnoreINT		; Timer1 Overflow Handler
	jmp IgnoreINT		; Timer0 Compare A Handler
	jmp IgnoreINT		; Timer0 Compare B Handler
	jmp IgnoreINT		; Timer0 Overflow Handler
	jmp IgnoreINT		; SPI Transfer Complete Handler
	jmp IgnoreINT		; USART, RX Complete Handler
	jmp IgnoreINT		; USART, UDR Empty Handler
	jmp IgnoreINT		; USART, TX Complete Handler
	jmp IgnoreINT		; ADC Conversion Complete Handler
	jmp IgnoreINT		; EEPROM Ready Handler
	jmp IgnoreINT		; Analog Comparator Handler
	jmp IgnoreINT		; 2-wire Serial Interface Handler
	jmp IgnoreINT		; Store Program Memory Ready Handler

IgnoreINT:	reti

RESET:	ldi   r16, RAMEND_HI	; Main program start
	out   SPH, r16		;Set Stack Pointer to top of RAM
	ldi   r16, RAMEND_LO
	out   SPL, r16
	cli			; No interrupts
	ldi   r16, 0x7e		; Turn off digital inputs on analog pins.
	sts   DIDR0, r16

	clr   r0		; 'A' All vars initialize to 0
	clr   r1
	clr   r2		; 'B'
	clr   r3
	clr   r4		; 'C'
	clr   r5
	clr   r6		; 'D'
	clr   r7
	clr   r8		; 'E'
	clr   r9

	jmp   LADDER		; Start climbing the ladder.

	; Read the ADC for a pin.
	; Desired source is in R16
getAnalog:
	; Setup ADC
	andi  r16, 7	; Which input to sample
	; Use Internal reference, right aligned
	ori   r16, 0xc0
	sts   ADMUX, r16
	ldi   r16, 0xc7 ; ADC Enable, ADC Start, No interrupt, /128
	sts   ADCSRA, r16
	; wait...
getAnalog_waitforit:
	lds   r16, ADCSRA
	sbrs  r16, 4	; If complete, stop waiting.
	rjmp  getAnalog_waitforit
	; Put result into r16:17
	lds   r16, ADCL
	lds   r17, ADCH
	ret

	; Set the PWM output on a pin.
	; R16:R17 is the value
	; R18 is which output
setPWM:
	; how to do this?
	ret


; vim: set ai cin noet sw=8 ts=8 :
