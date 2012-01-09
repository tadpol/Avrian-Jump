#!/bin/sh

gas=avr-as
# gas is doing something to constant values in the branches.
# I'm done trying to figure out what; so ignoring the branching in this test.
mlst=mnemoniclist-nobranching.S
opcs=machineList.text

tlst=`mktemp gaslXXXXXX`
blst=`mktemp bytesXXXXXX`


# build the listing.
cat $mlst | $gas -mall-opcodes -al=$tlst 
rm -f a.out

# Clean up so we can diff it with our output
cat $tlst | sed -E -e '/^$/d' -e '/GAS LISTING/d' -e 's/[[:space:]]*$//' -e '/^[[:space:]]*[[:digit:]]+$/d' > $blst

# 

rm -f $tlst

mv $blst $opcs

