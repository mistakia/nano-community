---
title: History of Nano
description: History of Nano
tags: nano, crypto, history, distribution, development, creation, background
---

# History

To better understand the vision and motivations behind digital money, you must trace its history to see how it was spawned and shaped. The origins date back to at least <a href="https://cacm.acm.org/magazines/2017/12/223058-bitcoins-academic-pedigree/fulltext" target="_blank">the 1990s</a>.

## Prelude

In 1976, the publication of <a href="https://ee.stanford.edu/~hellman/publications/24.pdf" target="_blank">“New Directions in Cryptography”</a> by Dr Whitfield Diffie and Dr Martin Hellman effectively terminated government control of cryptography. It marked the dawn of cryptography in the public domain. Dr David Chaum in the 1980s published multiple papers describing <a href="http://www.hit.bme.hu/~buttyan/courses/BMEVIHIM219/2009/Chaum.BlindSigForPayment.1982.PDF" target="_blank">digital money</a> and <a href="https://www.cs.umd.edu/~mmazurek/414-papers/chaum-identification.pdf" target="_blank">pseudonymous identity networks</a>.

Inspired by these ideas, Eric Hughes, Timothy C May, and John Gilmore formed a group called "cypherpunks" that met monthly in the Bay Area.

Shortly after, the Cypherpunks <a href="https://mailing-list-archive.cryptoanarchy.wiki/" target="_blank">mailing list</a> was created, followed by <a href="https://www.activism.net/cypherpunk/manifesto.html" target="_blank">“A Cypherpunk’s Manifesto“</a>, and a movement was born.

> We the Cypherpunks are dedicated to building anonymous systems. We are defending our privacy with cryptography, with anonymous mail forwarding systems, with digital signatures, and with electronic money.
> <cite>Eric Hughes</cite>

> For privacy to be widespread it must be part of a social contract. People must come and together deploy these systems for the common good. Privacy only extends so far as the cooperation of one's fellows in society.
> <cite>Eric Hughes</cite>

#### Cypherpunk manifest

- privacy is necessary for an open society and requires anonymous transaction systems
- the essence of privacy is not secrecy but rather control over ones personal information
- belief in the free flow of information
- privacy must be defended and fought for, it will not be granted
- write code and publish it for free for others to use, learn from, attack, and improve

Over the next decade, cypherpunks like Wei Dai, Hal Finney, Zooko Wilcox, Nick Szabo and Adam Back pushed the movement forward by working on projects such as <a href="https://nakamotoinstitute.org/bit-gold/" target="_blank">bit gold</a>, <a href="https://nakamotoinstitute.org/finney/rpow/" target="_blank">Rpow</a>, <a href="http://www.hashcash.org/" target="_blank">Hashcash</a>, and <a href="http://www.weidai.com/bmoney.txt" target="_blank">b-money</a>.

## Bitcoin

In October 2008, Satoshi Nakamoto published a white paper on the cryptography mailing list at metzdowd.com titled <a href="https://www.bitcoin.com/bitcoin.pdf" target="_blank">"Bitcoin: A Peer-to-Peer Electronic Cash System,"</a> which describes how "a purely peer-to-peer version of electronic cash would allow online payments to be sent directly from one party to another without going through a financial institution."

> The root problem with conventional currency is all the trust that’s required to make it work. The central bank must be trusted not to debase the currency, but the history of fiat currencies is full of breaches of that trust. Banks must be trusted to hold our money and transfer it electronically, but they lend it out in waves of credit bubbles with barely a fraction in reserve. We have to trust them with our privacy, trust them not to let identity thieves drain our accounts. Their massive overhead costs make micropayments impossible.
> <cite>Satoshi Nakamoto</cite>

Satoshi solved many of the problems that plagued previous attempts, especially the core problem of preventing a double-spend in a trustless and distributed manner. The paper did not have a warm welcome but instead attracted a lot of <a href="https://satoshi.nakamotoinstitute.org/emails/cryptography/threads/1/" target="_blank">criticism from skeptics</a>. Nakamoto continued on and mined the genesis block of Bitcoin on 3 January 2009 encoded with a message:

```
The Times 03/Jan/2009 Chancellor on brink of second bailout for banks
```

With that, Satoshi Nakamoto sparked an explosion of progress by releasing a working implementation of digital money that people could use, learn from, attack and improve.

As Bitcoin matured, several issues were identified that needed improvement in order for it to be useful as digital money.

1. Poor scalability & high fees: Each block in the blockchain can store a limited amount of data, which means the system can only process so many transactions per second, making spots in a block a commodity. Therefore, more use means higher fees and <a href="https://bitcoiner.live/" target="_blank">high fees</a> have made Bitcoin impractical for many use cases.

2. High latency: Average confirmation times fluctuate between 10 and 300 minutes. In addition, most Bitcoin services require more than one confirmation before considering a transaction fully-settled,often requiring six confirmations which adds another 60 minutes.

3. Power inefficient: The Bitcoin network's power consumption grows with its value. An increase in value will be followed by an increase in power consumption. As of April 2021, it has reached an <a href="https://digiconomist.net/bitcoin-energy-consumption/" target="_blank">estimated 107.97TWh per year, using an average of 1111 kWh per transaction</a>. On a yearly basis, the bitcoin network consumes more energy than all but 38 countries, falling in line with countries like Finland, Chile and Austria.

## Raiblocks

In January 2015, Colin LeMahieu publishes a post called <a href="https://bitcointalk.org/index.php?topic=928860" target="_blank">"block lattice project"</a>, later followed by <a href="https://bitcointalk.org/index.php?topic=1219264" target="_blank">"block lattice"</a>, on bitcointalk.org sharing a new ledger structure aimed at fixing Bitcoin's issues.

Similar to Satoshi's initial announcement, Colin's project garnered little attention and a skeptical reception at best. Undeterred, the network <a href="https://bitcointalk.org/index.php?topic=1208830" target="_blank">went live</a> later that year.

## Distribution

Nano was given away for free to anyone willing to manually complete a captcha. Distribution began in 2015 and ended in October 2017, at which point the faucet had distributed 126,248,289 NANO.

7,000,000 NANO (~5%) was set aside as a <a href="https://www.nanolooker.com/developer-fund" target="_blank">developer fund</a>, of which about ~300,000 Nano remain as of April 2021.

Because the distribution process was conducted on-chain, it is publicly available to be reviewed and audited by looking at the <a href="https://nanex.cc/accountstats?account=nano_13ezf4od79h1tgj9aiu4djzcmmguendtjfuhwfukhuucboua8cpoihmh8byo" target="_blank">Landing Account</a>.

A few notable statistics compiled by <a href="https://www.reddit.com/r/nanocurrency/comments/h7fmge/the_nano_faucet_distribution_visualized_and/" target="_blank">u/hanzyfranzy</a>:

- The median faucet user got 192.76 Nano from the faucet.
- There were a total of 130,814 faucet receive addresses.
- The biggest faucet recipient received 1,724,105 Nano, likely from abusing the Captchas at the very beginning. These types of accounts appear to be very rare and they seem to have sold much of their Nano long before the initial runup in 2017.

Nano's distribution is notable as 95% of the supply was given away for free. Nano has been fully distributed since 2017 and is now undergoing the process of redistribution through open markets.

## Bitgrail

On 9 February 2018, the Italian cryptocurrency exchange BitGrail announced its shutdown after being hacked. There were unaccounted losses of 17 million Nano from its wallets, preventing users from accessing assets stored on the platform. The victims sought recoupment through the Italian court system, and supported by the Nano Foundation, launched a class-action suit against BitGrail owner Francesco Firano. In January 2019, the Court of Florence found Firano liable for the losses after discovering that the exchange had failed to implement any meaningful safeguards to ensure the safety of their customers' funds and failed to report losses from as early as July 2017.

## Nano

On 31 January 2018, RaiBlocks rebranded to Nano.

## Community

### [NanoTrade](/history/community/nano-trade)

## Timeline

<figure>
<img alt='History of notable digital money advances & innovations' src="/resources/bitcoin-academic-pedigree.jpg" />
</figure>

<a href="https://nakamotoinstitute.org/literature/" target="_blank">Notable Publications</a>
