/*!
 * Набор полезных методов, дополняющих объект String
 * Библиотека зависит от XRegExp только в режиме разработки
 * 
 * @licence	http://creativecommons.org/licenses/by-sa/4.0/
 * @author	Nasibullin Rinat <rin-nas@ya.ru>
 * @version	1.0
 */

(function () {
	"use strict";

	/**
	 * HTML special chars table
	 * @var  Object
	 */
	String.HTML_SPECIAL_CHARS_TABLE = {
		quot : 0x0022,  //"\x22" ["] &#34; quotation mark = APL quote
		amp  : 0x0026,  //"\x26" [&] &#38; ampersand
		lt   : 0x003C,  //"\x3c" [<] &#60; less-than sign
		gt   : 0x003E,  //"\x3e" [>] &#62; greater-than sign
		//&apos; entity is only available in XHTML and not in plain HTML, see http://www.w3.org/TR/xhtml1///C_16
		apos : 0x0027  //"\x27" ['] &#39; apostrophe
	};

	/**
	 * HTML4 entity table
	 * TODO? HTML5 entity table https://www.w3.org/TR/html5/entities.json
	 * @link http://www.fileformat.info/format/w3c/entitytest.htm?sort=Unicode%20Character  HTML Entity Browser Test Page
	 * @var  Object
	 */
	String.HTML_ENTITY_TABLE = {
		//HTML special chars table
		quot : 0x0022,  //"\x22" ["] &#34; quotation mark = APL quote
		amp  : 0x0026,  //"\x26" [&] &#38; ampersand
		lt   : 0x003C,  //"\x3c" [<] &#60; less-than sign
		gt   : 0x003E,  //"\x3e" [>] &#62; greater-than sign
		//&apos; entity is only available in XHTML and not in plain HTML, see http://www.w3.org/TR/xhtml1///C_16
		apos : 0x0027,  //"\x27" ['] &#39; apostrophe
		//Latin-1 Entities:
		nbsp   : 0x00A0,  //"\xc2\xa0" [ ] no-break space = non-breaking space
		iexcl  : 0x00A1,  //"\xc2\xa1" [¡] inverted exclamation mark
		cent   : 0x00A2,  //"\xc2\xa2" [¢] cent sign
		pound  : 0x00A3,  //"\xc2\xa3" [£] pound sign
		curren : 0x00A4,  //"\xc2\xa4" [¤] currency sign
		yen    : 0x00A5,  //"\xc2\xa5" [¥] yen sign = yuan sign
		brvbar : 0x00A6,  //"\xc2\xa6" [¦] broken bar = broken vertical bar
		sect   : 0x00A7,  //"\xc2\xa7" [§] section sign
		uml    : 0x00A8,  //"\xc2\xa8" [¨] diaeresis = spacing diaeresis
		copy   : 0x00A9,  //"\xc2\xa9" [©] copyright sign
		ordf   : 0x00AA,  //"\xc2\xaa" [ª] feminine ordinal indicator
		laquo  : 0x00AB,  //"\xc2\xab" [«] left-pointing double angle quotation mark = left pointing guillemet
		not    : 0x00AC,  //"\xc2\xac" [¬] not sign
		shy    : 0x00AD,  //"\xc2\xad" [ ] soft hyphen = discretionary hyphen
		reg    : 0x00AE,  //"\xc2\xae" [®] registered sign = registered trade mark sign
		macr   : 0x00AF,  //"\xc2\xaf" [¯] macron = spacing macron = overline = APL overbar
		deg    : 0x00B0,  //"\xc2\xb0" [°] degree sign
		plusmn : 0x00B1,  //"\xc2\xb1" [±] plus-minus sign = plus-or-minus sign
		sup2   : 0x00B2,  //"\xc2\xb2" [²] superscript two = superscript digit two = squared
		sup3   : 0x00B3,  //"\xc2\xb3" [³] superscript three = superscript digit three = cubed
		acute  : 0x00B4,  //"\xc2\xb4" [´] acute accent = spacing acute
		micro  : 0x00B5,  //"\xc2\xb5" [µ] micro sign
		para   : 0x00B6,  //"\xc2\xb6" [¶] pilcrow sign = paragraph sign
		middot : 0x00B7,  //"\xc2\xb7" [·] middle dot = Georgian comma = Greek middle dot
		cedil  : 0x00B8,  //"\xc2\xb8" [¸] cedilla = spacing cedilla
		sup1   : 0x00B9,  //"\xc2\xb9" [¹] superscript one = superscript digit one
		ordm   : 0x00BA,  //"\xc2\xba" [º] masculine ordinal indicator
		raquo  : 0x00BB,  //"\xc2\xbb" [»] right-pointing double angle quotation mark = right pointing guillemet
		frac14 : 0x00BC,  //"\xc2\xbc" [¼] vulgar fraction one quarter = fraction one quarter
		frac12 : 0x00BD,  //"\xc2\xbd" [½] vulgar fraction one half = fraction one half
		frac34 : 0x00BE,  //"\xc2\xbe" [¾] vulgar fraction three quarters = fraction three quarters
		iquest : 0x00BF,  //"\xc2\xbf" [¿] inverted question mark = turned question mark
		//Latin capital letter
		Agrave : 0x00C0,  //"\xc3\x80" Latin capital letter A with grave = Latin capital letter A grave
		Aacute : 0x00C1,  //"\xc3\x81" Latin capital letter A with acute
		Acirc  : 0x00C2,  //"\xc3\x82" Latin capital letter A with circumflex
		Atilde : 0x00C3,  //"\xc3\x83" Latin capital letter A with tilde
		Auml   : 0x00C4,  //"\xc3\x84" Latin capital letter A with diaeresis
		Aring  : 0x00C5,  //"\xc3\x85" Latin capital letter A with ring above = Latin capital letter A ring
		AElig  : 0x00C6,  //"\xc3\x86" Latin capital letter AE = Latin capital ligature AE
		Ccedil : 0x00C7,  //"\xc3\x87" Latin capital letter C with cedilla
		Egrave : 0x00C8,  //"\xc3\x88" Latin capital letter E with grave
		Eacute : 0x00C9,  //"\xc3\x89" Latin capital letter E with acute
		Ecirc  : 0x00CA,  //"\xc3\x8a" Latin capital letter E with circumflex
		Euml   : 0x00CB,  //"\xc3\x8b" Latin capital letter E with diaeresis
		Igrave : 0x00CC,  //"\xc3\x8c" Latin capital letter I with grave
		Iacute : 0x00CD,  //"\xc3\x8d" Latin capital letter I with acute
		Icirc  : 0x00CE,  //"\xc3\x8e" Latin capital letter I with circumflex
		Iuml   : 0x00CF,  //"\xc3\x8f" Latin capital letter I with diaeresis
		ETH    : 0x00D0,  //"\xc3\x90" Latin capital letter ETH
		Ntilde : 0x00D1,  //"\xc3\x91" Latin capital letter N with tilde
		Ograve : 0x00D2,  //"\xc3\x92" Latin capital letter O with grave
		Oacute : 0x00D3,  //"\xc3\x93" Latin capital letter O with acute
		Ocirc  : 0x00D4,  //"\xc3\x94" Latin capital letter O with circumflex
		Otilde : 0x00D5,  //"\xc3\x95" Latin capital letter O with tilde
		Ouml   : 0x00D6,  //"\xc3\x96" Latin capital letter O with diaeresis
		times  : 0x00D7,  //"\xc3\x97" [×] multiplication sign
		Oslash : 0x00D8,  //"\xc3\x98" Latin capital letter O with stroke = Latin capital letter O slash
		Ugrave : 0x00D9,  //"\xc3\x99" Latin capital letter U with grave
		Uacute : 0x00DA,  //"\xc3\x9a" Latin capital letter U with acute
		Ucirc  : 0x00DB,  //"\xc3\x9b" Latin capital letter U with circumflex
		Uuml   : 0x00DC,  //"\xc3\x9c" Latin capital letter U with diaeresis
		Yacute : 0x00DD,  //"\xc3\x9d" Latin capital letter Y with acute
		THORN  : 0x00DE,  //"\xc3\x9e" Latin capital letter THORN
		//Latin small letter
		szlig  : 0x00DF,  //"\xc3\x9f" Latin small letter sharp s = ess-zed
		agrave : 0x00E0,  //"\xc3\xa0" Latin small letter a with grave = Latin small letter a grave
		aacute : 0x00E1,  //"\xc3\xa1" Latin small letter a with acute
		acirc  : 0x00E2,  //"\xc3\xa2" Latin small letter a with circumflex
		atilde : 0x00E3,  //"\xc3\xa3" Latin small letter a with tilde
		auml   : 0x00E4,  //"\xc3\xa4" Latin small letter a with diaeresis
		aring  : 0x00E5,  //"\xc3\xa5" Latin small letter a with ring above = Latin small letter a ring
		aelig  : 0x00E6,  //"\xc3\xa6" Latin small letter ae = Latin small ligature ae
		ccedil : 0x00E7,  //"\xc3\xa7" Latin small letter c with cedilla
		egrave : 0x00E8,  //"\xc3\xa8" Latin small letter e with grave
		eacute : 0x00E9,  //"\xc3\xa9" Latin small letter e with acute
		ecirc  : 0x00EA,  //"\xc3\xaa" Latin small letter e with circumflex
		euml   : 0x00EB,  //"\xc3\xab" Latin small letter e with diaeresis
		igrave : 0x00EC,  //"\xc3\xac" Latin small letter i with grave
		iacute : 0x00ED,  //"\xc3\xad" Latin small letter i with acute
		icirc  : 0x00EE,  //"\xc3\xae" Latin small letter i with circumflex
		iuml   : 0x00EF,  //"\xc3\xaf" Latin small letter i with diaeresis
		eth    : 0x00F0,  //"\xc3\xb0" Latin small letter eth
		ntilde : 0x00F1,  //"\xc3\xb1" Latin small letter n with tilde
		ograve : 0x00F2,  //"\xc3\xb2" Latin small letter o with grave
		oacute : 0x00F3,  //"\xc3\xb3" Latin small letter o with acute
		ocirc  : 0x00F4,  //"\xc3\xb4" Latin small letter o with circumflex
		otilde : 0x00F5,  //"\xc3\xb5" Latin small letter o with tilde
		ouml   : 0x00F6,  //"\xc3\xb6" Latin small letter o with diaeresis
		divide : 0x00F7,  //"\xc3\xb7" [÷] division sign
		oslash : 0x00F8,  //"\xc3\xb8" Latin small letter o with stroke = Latin small letter o slash
		ugrave : 0x00F9,  //"\xc3\xb9" Latin small letter u with grave
		uacute : 0x00FA,  //"\xc3\xba" Latin small letter u with acute
		ucirc  : 0x00FB,  //"\xc3\xbb" Latin small letter u with circumflex
		uuml   : 0x00FC,  //"\xc3\xbc" Latin small letter u with diaeresis
		yacute : 0x00FD,  //"\xc3\xbd" Latin small letter y with acute
		thorn  : 0x00FE,  //"\xc3\xbe" Latin small letter thorn
		yuml   : 0x00FF,  //"\xc3\xbf" Latin small letter y with diaeresis
		OElig  : 0x0152,  //"\xc5\x92" [Œ] Latin capital ligature OE
		oelig  : 0x0153,  //"\xc5\x93" [œ] Latin small ligature oe
		Scaron : 0x0160,  //"\xc5\xa0" [Š] Latin capital letter S with caron
		scaron : 0x0161,  //"\xc5\xa1" [š] Latin small letter s with caron
		Yuml   : 0x0178,  //"\xc5\xb8" [Ÿ] Latin capital letter Y with diaeresis
		fnof   : 0x0192,  //"\xc6\x92" [ƒ] Latin small f with hook = function = florin
		circ   : 0x02C6,  //"\xcb\x86" [ˆ] modifier letter circumflex accent
		tilde  : 0x02DC,  //"\xcb\x9c" [˜] small tilde
		//Symbols and Greek Letters:
		Alpha   : 0x0391,  //"\xce\x91" Greek capital letter alpha
		Beta    : 0x0392,  //"\xce\x92" Greek capital letter beta
		Gamma   : 0x0393,  //"\xce\x93" Greek capital letter gamma
		Delta   : 0x0394,  //"\xce\x94" Greek capital letter delta
		Epsilon : 0x0395,  //"\xce\x95" Greek capital letter epsilon
		Zeta    : 0x0396,  //"\xce\x96" Greek capital letter zeta
		Eta     : 0x0397,  //"\xce\x97" Greek capital letter eta
		Theta   : 0x0398,  //"\xce\x98" Greek capital letter theta
		Iota    : 0x0399,  //"\xce\x99" Greek capital letter iota
		Kappa   : 0x039A,  //"\xce\x9a" Greek capital letter kappa
		Lambda  : 0x039B,  //"\xce\x9b" Greek capital letter lambda
		Mu      : 0x039C,  //"\xce\x9c" Greek capital letter mu
		Nu      : 0x039D,  //"\xce\x9d" Greek capital letter nu
		Xi      : 0x039E,  //"\xce\x9e" Greek capital letter xi
		Omicron : 0x039F,  //"\xce\x9f" Greek capital letter omicron
		Pi      : 0x03A0,  //"\xce\xa0" Greek capital letter pi
		Rho     : 0x03A1,  //"\xce\xa1" Greek capital letter rho
		Sigma   : 0x03A3,  //"\xce\xa3" Greek capital letter sigma
		Tau     : 0x03A4,  //"\xce\xa4" Greek capital letter tau
		Upsilon : 0x03A5,  //"\xce\xa5" Greek capital letter upsilon
		Phi     : 0x03A6,  //"\xce\xa6" Greek capital letter phi
		Chi     : 0x03A7,  //"\xce\xa7" Greek capital letter chi
		Psi     : 0x03A8,  //"\xce\xa8" Greek capital letter psi
		Omega   : 0x03A9,  //"\xce\xa9" Greek capital letter omega
		alpha   : 0x03B1,  //"\xce\xb1" Greek small letter alpha
		beta    : 0x03B2,  //"\xce\xb2" Greek small letter beta
		gamma   : 0x03B3,  //"\xce\xb3" Greek small letter gamma
		delta   : 0x03B4,  //"\xce\xb4" Greek small letter delta
		epsilon : 0x03B5,  //"\xce\xb5" Greek small letter epsilon
		zeta    : 0x03B6,  //"\xce\xb6" Greek small letter zeta
		eta     : 0x03B7,  //"\xce\xb7" Greek small letter eta
		theta   : 0x03B8,  //"\xce\xb8" Greek small letter theta
		iota    : 0x03B9,  //"\xce\xb9" Greek small letter iota
		kappa   : 0x03BA,  //"\xce\xba" Greek small letter kappa
		lambda  : 0x03BB,  //"\xce\xbb" Greek small letter lambda
		mu      : 0x03BC,  //"\xce\xbc" Greek small letter mu
		nu      : 0x03BD,  //"\xce\xbd" Greek small letter nu
		xi      : 0x03BE,  //"\xce\xbe" Greek small letter xi
		omicron : 0x03BF,  //"\xce\xbf" Greek small letter omicron
		pi      : 0x03C0,  //"\xcf\x80" Greek small letter pi
		rho     : 0x03C1,  //"\xcf\x81" Greek small letter rho
		sigmaf  : 0x03C2,  //"\xcf\x82" Greek small letter final sigma
		sigma   : 0x03C3,  //"\xcf\x83" Greek small letter sigma
		tau     : 0x03C4,  //"\xcf\x84" Greek small letter tau
		upsilon : 0x03C5,  //"\xcf\x85" Greek small letter upsilon
		phi     : 0x03C6,  //"\xcf\x86" Greek small letter phi
		chi     : 0x03C7,  //"\xcf\x87" Greek small letter chi
		psi     : 0x03C8,  //"\xcf\x88" Greek small letter psi
		omega   : 0x03C9,  //"\xcf\x89" Greek small letter omega
		thetasym: 0x03D1,  //"\xcf\x91" Greek small letter theta symbol
		upsih   : 0x03D2,  //"\xcf\x92" Greek upsilon with hook symbol
		piv     : 0x03D6,  //"\xcf\x96" [ϖ] Greek pi symbol
		//Other chars:
		ensp    : 0x2002,  //"\xe2\x80\x82" [ ] en space
		emsp    : 0x2003,  //"\xe2\x80\x83" [ ] em space
		thinsp  : 0x2009,  //"\xe2\x80\x89" [ ] thin space
		zwnj    : 0x200C,  //"\xe2\x80\x8c" [‌] zero width non-joiner
		zwj     : 0x200D,  //"\xe2\x80\x8d" [‍] zero width joiner
		lrm     : 0x200E,  //"\xe2\x80\x8e" [‎] left-to-right mark
		rlm     : 0x200F,  //"\xe2\x80\x8f" [‏] right-to-left mark
		ndash   : 0x2013,  //"\xe2\x80\x93" [–] en dash
		mdash   : 0x2014,  //"\xe2\x80\x94" [—] em dash
		lsquo   : 0x2018,  //"\xe2\x80\x98" [‘] left single quotation mark
		rsquo   : 0x2019,  //"\xe2\x80\x99" [’] right single quotation mark (and apostrophe!)
		sbquo   : 0x201A,  //"\xe2\x80\x9a" [‚] single low-9 quotation mark
		ldquo   : 0x201C,  //"\xe2\x80\x9c" [“] left double quotation mark
		rdquo   : 0x201D,  //"\xe2\x80\x9d" [”] right double quotation mark
		bdquo   : 0x201E,  //"\xe2\x80\x9e" [„] double low-9 quotation mark
		dagger  : 0x2020,  //"\xe2\x80\xa0" [†] dagger
		Dagger  : 0x2021,  //"\xe2\x80\xa1" [‡] double dagger
		bull    : 0x2022,  //"\xe2\x80\xa2" [•] bullet = black small circle
		hellip  : 0x2026,  //"\xe2\x80\xa6" […] horizontal ellipsis = three dot leader
		permil  : 0x2030,  //"\xe2\x80\xb0" [‰] per mille sign
		prime   : 0x2032,  //"\xe2\x80\xb2" [′] prime = minutes = feet (для обозначения минут и футов)
		Prime   : 0x2033,  //"\xe2\x80\xb3" [″] double prime = seconds = inches (для обозначения секунд и дюймов).
		lsaquo  : 0x2039,  //"\xe2\x80\xb9" [‹] single left-pointing angle quotation mark
		rsaquo  : 0x203A,  //"\xe2\x80\xba" [›] single right-pointing angle quotation mark
		oline   : 0x203E,  //"\xe2\x80\xbe" [‾] overline = spacing overscore
		frasl   : 0x2044,  //"\xe2\x81\x84" [⁄] fraction slash
		euro    : 0x20AC,  //"\xe2\x82\xac" [€] euro sign
		image   : 0x2111,  //"\xe2\x84\x91" [ℑ] blackletter capital I = imaginary part
		weierp  : 0x2118,  //"\xe2\x84\x98" [℘] script capital P = power set = Weierstrass p
		real    : 0x211C,  //"\xe2\x84\x9c" [ℜ] blackletter capital R = real part symbol
		trade   : 0x2122,  //"\xe2\x84\xa2" [™] trade mark sign
		alefsym : 0x2135,  //"\xe2\x84\xb5" [ℵ] alef symbol = first transfinite cardinal
		larr    : 0x2190,  //"\xe2\x86\x90" [←] leftwards arrow
		uarr    : 0x2191,  //"\xe2\x86\x91" [↑] upwards arrow
		rarr    : 0x2192,  //"\xe2\x86\x92" [→] rightwards arrow
		darr    : 0x2193,  //"\xe2\x86\x93" [↓] downwards arrow
		harr    : 0x2194,  //"\xe2\x86\x94" [↔] left right arrow
		crarr   : 0x21B5,  //"\xe2\x86\xb5" [↵] downwards arrow with corner leftwards = carriage return
		lArr    : 0x21D0,  //"\xe2\x87\x90" [⇐] leftwards double arrow
		uArr    : 0x21D1,  //"\xe2\x87\x91" [⇑] upwards double arrow
		rArr    : 0x21D2,  //"\xe2\x87\x92" [⇒] rightwards double arrow
		dArr    : 0x21D3,  //"\xe2\x87\x93" [⇓] downwards double arrow
		hArr    : 0x21D4,  //"\xe2\x87\x94" [⇔] left right double arrow
		forall  : 0x2200,  //"\xe2\x88\x80" [∀] for all
		part    : 0x2202,  //"\xe2\x88\x82" [∂] partial differential
		exist   : 0x2203,  //"\xe2\x88\x83" [∃] there exists
		empty   : 0x2205,  //"\xe2\x88\x85" [∅] empty set = null set = diameter
		nabla   : 0x2207,  //"\xe2\x88\x87" [∇] nabla = backward difference
		isin    : 0x2208,  //"\xe2\x88\x88" [∈] element of
		notin   : 0x2209,  //"\xe2\x88\x89" [∉] not an element of
		ni      : 0x220B,  //"\xe2\x88\x8b" [∋] contains as member
		prod    : 0x220F,  //"\xe2\x88\x8f" [∏] n-ary product = product sign
		sum     : 0x2211,  //"\xe2\x88\x91" [∑] n-ary sumation
		minus   : 0x2212,  //"\xe2\x88\x92" [−] minus sign
		lowast  : 0x2217,  //"\xe2\x88\x97" [∗] asterisk operator
		radic   : 0x221A,  //"\xe2\x88\x9a" [√] square root = radical sign
		prop    : 0x221D,  //"\xe2\x88\x9d" [∝] proportional to
		infin   : 0x221E,  //"\xe2\x88\x9e" [∞] infinity
		ang     : 0x2220,  //"\xe2\x88\xa0" [∠] angle
		and     : 0x2227,  //"\xe2\x88\xa7" [∧] logical and = wedge
		or      : 0x2228,  //"\xe2\x88\xa8" [∨] logical or = vee
		cap     : 0x2229,  //"\xe2\x88\xa9" [∩] intersection = cap
		cup     : 0x222A,  //"\xe2\x88\xaa" [∪] union = cup
		'int'   : 0x222B,  //"\xe2\x88\xab" [∫] integral
		there4  : 0x2234,  //"\xe2\x88\xb4" [∴] therefore
		sim     : 0x223C,  //"\xe2\x88\xbc" [∼] tilde operator = varies with = similar to
		cong    : 0x2245,  //"\xe2\x89\x85" [≅] approximately equal to
		asymp   : 0x2248,  //"\xe2\x89\x88" [≈] almost equal to = asymptotic to
		ne      : 0x2260,  //"\xe2\x89\xa0" [≠] not equal to
		equiv   : 0x2261,  //"\xe2\x89\xa1" [≡] identical to
		le      : 0x2264,  //"\xe2\x89\xa4" [≤] less-than or equal to
		ge      : 0x2265,  //"\xe2\x89\xa5" [≥] greater-than or equal to
		sub     : 0x2282,  //"\xe2\x8a\x82" [⊂] subset of
		sup     : 0x2283,  //"\xe2\x8a\x83" [⊃] superset of
		nsub    : 0x2284,  //"\xe2\x8a\x84" [⊄] not a subset of
		sube    : 0x2286,  //"\xe2\x8a\x86" [⊆] subset of or equal to
		supe    : 0x2287,  //"\xe2\x8a\x87" [⊇] superset of or equal to
		oplus   : 0x2295,  //"\xe2\x8a\x95" [⊕] circled plus = direct sum
		otimes  : 0x2297,  //"\xe2\x8a\x97" [⊗] circled times = vector product
		perp    : 0x22A5,  //"\xe2\x8a\xa5" [⊥] up tack = orthogonal to = perpendicular
		sdot    : 0x22C5,  //"\xe2\x8b\x85" [⋅] dot operator
		lceil   : 0x2308,  //"\xe2\x8c\x88" [⌈] left ceiling = APL upstile
		rceil   : 0x2309,  //"\xe2\x8c\x89" [⌉] right ceiling
		lfloor  : 0x230A,  //"\xe2\x8c\x8a" [⌊] left floor = APL downstile
		rfloor  : 0x230B,  //"\xe2\x8c\x8b" [⌋] right floor
		lang    : 0x2329,  //"\xe2\x8c\xa9" [〈] left-pointing angle bracket = bra
		rang    : 0x232A,  //"\xe2\x8c\xaa" [〉] right-pointing angle bracket = ket
		loz     : 0x25CA,  //"\xe2\x97\x8a" [◊] lozenge
		spades  : 0x2660,  //"\xe2\x99\xa0" [♠] black spade suit
		clubs   : 0x2663,  //"\xe2\x99\xa3" [♣] black club suit = shamrock
		hearts  : 0x2665,  //"\xe2\x99\xa5" [♥] black heart suit = valentine
		diams   : 0x2666,  //"\xe2\x99\xa6" [♦] black diamond suit
	};

	/**
	 * HTML detect
	 * @returns	{number}	result of String.search()
	 */
	String.prototype.htmlIndexOf = function () {
		if (false) { //development mode
			/*
			Fast and short implementation.
			No needs to check closed tags, because they don't exist without opened tags
			No needs to check HTML entities, because it is ambiguous
			We use atomic group (trick with lookahead, capturing group and link after) to speed improve, significantly reduce backtracking!
			*/
			var ANY_WITH_EXCEPTIONS	= /(?= ([^>"']+) )\1/,
				IN_DOUBLE_QUOTES	= /" [^"]* "/,
				IN_SINGLE_QUOTES	= /' [^']* '/,
				OPENED_OR_DOCTYPE	= RegExp('<!?[a-zA-Z]  [^>"\']*  (?:' + XRegExp.union([ANY_WITH_EXCEPTIONS, IN_DOUBLE_QUOTES, IN_SINGLE_QUOTES], 'xs').source + ')*>'),
				CDATA	= /<!\[CDATA\[  [^\]]*  .*?  \]\]>/,
				COMMENT = /<!--  [^-]*  .*?  -->/,
				ALL = XRegExp.union([OPENED_OR_DOCTYPE, CDATA, COMMENT], 'xs');
			ALL = RegExp(ALL.source.replace(/\(\?:\)/g, ''), '');
			console.log(ALL);
		}
		else { //production mode
			var ALL = /<!?[a-zA-Z][^>"']*(?:(?=([^>"']+))\1|"[^"]*"|'[^']*')*>|<!\[CDATA\[[^\]]*[\s\S]*?\]\]>|<!--[^-]*[\s\S]*?-->/;
		}
		return this.search(ALL);
	}

	/**
	 * HTML attribute SAX parser
	 * Этот парсер не делает массив всех атрибутов тега, а делает обработку последовательно.
	 * 
	 * @param {function}  Если в процессе обработки нужная информация нашлась, нет смысла продолжать анализ остальных атрибутов.
	 *					  Поэтому, если пользовательская callback функция возвращает true, то обработка продолжится, иначе прервётся.
	 * @link https://www.w3.org/TR/html5/
	 * @link http://html5sec.org/
	 * @returns bool
	 */
	String.prototype.htmlAttrParser = function (reviver) {

		if (false) { //development mode
			var spacesRe = /\x00-\x20\x7f\xA0\s/.source;

			//https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions#special-word
			var attrRe = `	([-\\w:]+)  #(1) name
							(?:
								[` + spacesRe + `]* = [` + spacesRe + `]*
								(?:
										( [^"'] [^` + spacesRe + `]* ) #(2) value
									|	"  ([^"]*)  "	#(3) value
									|	'  ([^']*)  '	#(4) value
								)
							)?`;

			attrRe = RegExp(XRegExp(attrRe, 'xs').source.replace(/\(\?:\)/g, ''), 'g');
			console.log(attrRe);
		}
		else { //production mode
			var attrRe = /([-\w:]+)(?:[\x00-\x20\x7f\xA0\s]*=[\x00-\x20\x7f\xA0\s]*(?:([^"'][^\x00-\x20\x7f\xA0\s]*)|"([^"]*)"|'([^']*)'))?/g;
		}
		
		var match, name, value, offset,
			attrs = 0,
			attrsMax  = 100,
			offsetMax = 50000;

		while (true) {
			if (++attrs > attrsMax) throw Error(attrsMax + ' attributes has been reached!');
			match = attrRe.exec(this);
			if (! match) break;
			if (match['index'] > offsetMax) throw Error(offsetMax + ' offset has been reached!');
			offset = match['index'];
			name = match[1].toLowerCase();
			if (typeof match[2] === 'string')      value = match[2];
			else if (typeof match[3] === 'string') value = match[3];
			else if (typeof match[4] === 'string') value = match[4];
			else value = '';
			if (! reviver(name, value, offset)) return false;
		}//while
		return true;
	}
	
	/**
	 * HTML SAX parser
	 * Этот парсер не строит DOM дерево сразу целиком, а делает обработку HTML узлов последовательно.
	 * TODO <!--noindex-->...<!--/noindex-->
	 * 
	 * @param {function}  Если в процессе обработки нужная информация нашлась, нет смысла продолжать анализ HTML документа.
	 *					  Поэтому, если пользовательская callback функция возвращает true, то обработка продолжится, иначе прервётся.
	 * @link https://www.w3.org/TR/html5/
	 * @link http://html5sec.org/
	 * @returns bool
	 */
	String.prototype.htmlParser = function (reviver) {

		var makeMap = function (str) {
			var obj = {}, items = str.split(',');
			for (var i = 0; i < items.length; i++) obj[ items[i] ] = true;
			return obj;
		};

		//void (empty, self-closing) elements
		var tagsVoid = makeMap(
			//HTML5 https://www.w3.org/TR/html5/syntax.html#elements-0
			'area,base,br,col,command,embed,hr,img,input,keygen,link,meta,param,source,track,wbr' +
			//HTML 4.01 deprecated
			',basefont,frame,isindex'
		);

		//escapable raw text elements (can have html entities)
		var tagsRawEsc = makeMap('textarea,title');

		if (false) { //development mode
			
			var tagsRawRe = 'script|style|xmp' +	//raw text elements (as is)
							'|textarea|title' +		//escapable raw text elements (can have html entities)
							'|math|svg';			//raw text elements (as is)

			var spacesRe = /\x00-\x20\x7f\xA0\s/.source;

			var attrsRe = function (n) {
				//fast short implementation
				return `[^>"']*  #speed improve
						(?:
								(?= ([^>"']+) )\\n
							|	"  [^"]*  "
							|	'  [^']*  '
						)*`
						.replace('n', n);
			};

			//https://regex101.com/#pcre
			var htmlRe = `<(?:
								#pairs raw tags with content:
								((` + tagsRawRe + `) (?=[>` + spacesRe + `])` + attrsRe(3) + `)>  #(1) opened tag
									(	#(4) raw inner
										[^<]*  #speed improve
										.*?
									)
								</(\\2) (?=[>` + spacesRe + `])` + attrsRe(6) + `>  #(5) closed tag

								#(7) opened tags:
							|	(	(?=[a-z])
									(?! (?:` + tagsRawRe + `) (?=[>` + spacesRe + `]) )
									` + attrsRe(8) + `
								)>

							|	/([a-z]` + attrsRe(10) + `)>	#(9) closed tags
							|	!([a-z]` + attrsRe(12) + `)>	#(11) <!DOCTYPE ...>
							|	!\\[CDATA\\[	([^\\]]*  .*?)	\\]\\] >	#(13) CDATA
							|	!--				([^-]*    .*?)	    -- >	#(14) comments
							|	\\?				([^\\?]*  .*?)	   \\? >	#(15) instructions part1 (PHP, Perl, ASP, JSP, XML)
							|	%				([^%]*    .*?)		 % >	#(16) instructions part2 (PHP, Perl, ASP, JSP)
							) [` + spacesRe + `]*
								#(17) text:
							|	((?:
										[^<]+
									|	< (?! /? [a-z]
											| !(?: \\[CDATA\\[ | -- )
											| [\\?%]
											)
								)+)`;

			//https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions#special-word
			var tagRe = '^([-\\w:]+) [' + spacesRe + ']* (.*)$';

			htmlRe = RegExp(XRegExp(htmlRe, 'xs').source.replace(/\(\?:\)/g, ''), 'gi');
			tagRe  = RegExp(XRegExp(tagRe, 'xs').source.replace(/\(\?:\)/g, ''), '');
			console.log(htmlRe);
			console.log(tagRe);
		}
		else { //production mode
			var htmlRe = /<(?:((script|style|xmp|textarea|title|math|svg)(?=[>\x00-\x20\x7f\xA0\s])[^>"']*(?:(?=([^>"']+))\3|"[^"]*"|'[^']*')*)>([^<]*[\s\S]*?)<\/(\2)(?=[>\x00-\x20\x7f\xA0\s])[^>"']*(?:(?=([^>"']+))\6|"[^"]*"|'[^']*')*>|((?=[a-z])(?!(?:script|style|xmp|textarea|title)(?=[>\x00-\x20\x7f\xA0\s]))[^>"']*(?:(?=([^>"']+))\8|"[^"]*"|'[^']*')*)>|\/([a-z][^>"']*(?:(?=([^>"']+))\10|"[^"]*"|'[^']*')*)>|!([a-z][^>"']*(?:(?=([^>"']+))\12|"[^"]*"|'[^']*')*)>|!\[CDATA\[([^\]]*[\s\S]*?)\]\]>|!--([^-]*[\s\S]*?)-->|\?([^\?]*[\s\S]*?)\?>|%([^%]*[\s\S]*?)%>)[\x00-\x20\x7f\xA0\s]*|((?:[^<]+|<(?!\/?[a-z]|!(?:\[CDATA\[|--)|[\?%]))+)/gi,
				tagRe  = /^([-\w:]+)[\x00-\x20\x7f\xA0\s]*([\s\S]*)$/;
		}
		var match, m, type, node, attrs, offset,
			nodes = 0, 
			nodesMax  = 10000,
			offsetMax = 5000000,
			typesMap = {
				//elements order is important!
				//1, 4, 5 = pairs raw tags with content
				1  : 'open',
				4  : 'raw',
				5  : 'close',
				7  : 'open',
				9  : 'close',
				11 : 'doctype',
				13 : 'cdata',
				14 : 'comment',
				15 : 'instruct',
				16 : 'instruct',
				17 : 'text'
			};

		while (true) {
			if (++nodes > nodesMax) throw Error(nodesMax + ' nodes has been reached!');
			match = htmlRe.exec(this);
			if (! match) break;
			if (match['index'] > offsetMax) throw Error(offsetMax + ' offset has been reached!');
			for (var i in typesMap) {
				if (typeof match[i] !== 'string') continue;
				type  = typesMap[i];
				node  = match[i].trim();
				if (! node.length) continue;  //skip empties
				if (type !== 'text') node = match[i];
				attrs = '';
				offset = match['index'];
				if (type === 'open') {
					m = tagRe.exec(match[i]);
					if (m) node = m[1].toLowerCase(), attrs = m[2];
					if (node in tagsVoid) type = 'void';
				}
				else if (type === 'close') {
					node = node.toLowerCase();
					if (i == 5) offset += (match[1].length + 1) + match[4].length;
				}
				else if (type === 'raw') {
					if (match[2].toLowerCase() in tagsRawEsc) type = 'text';
					offset += match[1].length + 1;
				}
				if (! reviver(type, node, attrs, offset)) return false;
				if (i > 5) break;  //1, 4, 5 = pairs raw tags with content
			}//for
		}//while
		return true;
	}

	/**
	 * HTML Entity Decode
	 * HTML entities examples: &gt; &Ouml; &#x02DC; &#34;
	 * 
	 * @param	{bool}	[strict=true]
	 * @returns {string}
	 * @link https://mothereff.in/html-entities
	 */
	String.prototype.htmlEntityDecode = function (strict) {

		if (this.indexOf('&') < 0) return this;  //speed improve
		if (! arguments.length) strict = true;
		
		if (false) { //development mode
			//We use atomic group (trick with lookahead, capturing group and link after) to speed improve, significantly reduce backtracking!
			var htmlEntityRe = strict	? '&(	(?= ([a-zA-Z][a-zA-Z\\d]+) )\\2	\n\
											|	\\# (?:	\\d{1,5}				\n\
													|	x[\\da-fA-F]{2,4}		\n\
													)							\n\
											)									\n\
										   ;'
										//http://stackoverflow.com/questions/15532252/why-is-reg-being-rendered-as-without-the-bounding-semicolon
										: '&(	(?= ([a-zA-Z][a-zA-Z\\d]+) )\\2  (?!=)	\n\
											|	\\# (?:	\\d{1,5}						\n\
													|	x[\\da-fA-F]{2,4}				\n\
													)									\n\
											)											\n\
										   ;?';
			htmlEntityRe = RegExp(XRegExp(htmlEntityRe, 'xs').source.replace(/\(\?:\)/g, ''), 'g');
			console.log(htmlEntityRe);
		}
		else { //production mode
			var htmlEntityRe = strict	? /&((?=([a-zA-Z][a-zA-Z\d]+))\2|\#(?:\d{1,5}|x[\da-fA-F]{2,4}));/g 
										: /&((?=([a-zA-Z][a-zA-Z\d]+))\2(?!=)|\#(?:\d{1,5}|x[\da-fA-F]{2,4}));?/g;
		}
		return this.replace(
			htmlEntityRe,
			function (str, key) {
				if (key[0] !== '#') {
					if (String.HTML_ENTITY_TABLE.hasOwnProperty(key))
						return String.fromCharCode(String.HTML_ENTITY_TABLE[key]);
					return str; //unknown entry
				}
				return String.fromCharCode(key[1] === 'x'	? parseInt(key.substr(2), 16) 
															: parseInt(key.substr(1), 10));
			}
		);
	};
	
	/**
	 * Вырезает все теги из HTML
	 * Гораздо умнее, чем str.replace(/<[^>]*>/g, '')
	 * Корректно обрабатывается "грязный" html: 
	 *		* в тексте могут втречаться конструкции типа "a < b > c"
	 *		* в значениях атрибутов тегов могут встречаться символы < >
	 * Вырезает некоторые парные теги вместе с содержимым
	 * Допускает, что некоторые парные теги могут быть не закрыты
	 * Старается сохранить форматирование
	 * 
	 * @returns {string}
	 */
	String.prototype.htmlToText = function () {

		if (this.indexOf('<') < 0) return this;  //speed improve

		if (false) { //development mode
		
			var pairTagsWithContentRe = 'script|style|map|iframe|frameset|object|applet|comment|button|textarea|select|math|svg';

			var attrsRe = function (n) {
				//fast short implementation
				return `[^>"']*  #speed improve
						(?:
								(?= ([^>"']+) )\\n
							|	"  [^"]*  "
							|	'  [^']*  '
						)*`
						.replace('n', n);
			};
			
			//https://regex101.com/#pcre
			var htmlRe = `(?:
							#pair tags with content:
							<	(?=[a-z])		#speed improve optimization
								(` + pairTagsWithContentRe + `)\\b	#1
								` + attrsRe(2) + `
							>
								[^<]*  #speed improve
								.*?
							< (?!script\\b|style\\b)
								/?
								\\1\\b` + attrsRe(3) + `
							>								

							#opened tags:
						|	<	(?=[a-z])
								(?!(?:` + pairTagsWithContentRe + `)\\b)
								` + attrsRe(4) + `
							>

						|	</[a-z]` + attrsRe(5) + `>		#closed tags
						|	<![a-z]` + attrsRe(6) + `>		#<!DOCTYPE ...>
						|	<!\\[CDATA\\[  [^\\]]*  .*?  \\]\\]>	#CDATA
						|	<!--  [^-]*    .*?   -->	#comments
						|	<\\?  [^\\?]*  .*?  \\?>	#instructions part1 (PHP, Perl, ASP, JSP, XML)
						|	<%	  [^%]*    .*?    %>	#instructions part2 (PHP, Perl, ASP, JSP)
						)`;

			htmlRe = RegExp(XRegExp(htmlRe, 'xs').source.replace(/\(\?:\)/g, ''), 'ig');
			console.log(htmlRe);
		}
		else { //production mode
			var htmlRe = /(?:<(?=[a-z])(script|style|map|iframe|frameset|object|applet|comment|button|textarea|select|math|svg)\b[^>"']*(?:(?=([^>"']+))\2|"[^"]*"|'[^']*')*>[^<]*[\s\S]*?<(?!script\b|style\b)\/?\1\b[^>"']*(?:(?=([^>"']+))\3|"[^"]*"|'[^']*')*>|<(?=[a-z])(?!(?:script|style|map|iframe|frameset|object|applet|comment|button|textarea|select)\b)[^>"']*(?:(?=([^>"']+))\4|"[^"]*"|'[^']*')*>|<\/[a-z][^>"']*(?:(?=([^>"']+))\5|"[^"]*"|'[^']*')*>|<![a-z][^>"']*(?:(?=([^>"']+))\6|"[^"]*"|'[^']*')*>|<!\[CDATA\[[^\]]*[\s\S]*?\]\]>|<!--[^-]*[\s\S]*?-->|<\?[^\?]*[\s\S]*?\?>|<%[^%]*[\s\S]*?%>)/gi;
		}

		//https://developer.mozilla.org/ru/docs/Web/HTML/Block-level_elements
		//http://www.tutorialchip.com/tutorials/html5-block-level-elements-complete-list/
		var blockTagsRe = 
			//Paragraph boundaries are inserted at every block-level HTML tag. Namely, those are (as taken from HTML 4 standard)
			'blockquote|caption|center|dd|div|dl|dt|h[1-6]|hr|li|menu|ol|p|pre|table|tbody|td|tfoot|th|thead|tr|ul' +
			//HTML5
			'|article|aside|audio|canvas|figcaption|figure|footer|header|hgroup|output|progress|section|video' +
			//Extended
			'|form|title|br';
		var htmlBlockTagsRe = RegExp('^<(?=[a-z])(?:'+ blockTagsRe + ')\\b', 'i');
		
		var str = this.replace(
			htmlRe,
			function (str, entry) {
				if (str.search(htmlBlockTagsRe) > -1) return '\n';
				return '';
			}
		);

		return str.htmlEntityDecode(false).normalize();
	}

	/**
	 * Remove a duplicate spaces and some chars + normalize spaces and newlines
	 * 
	 * @returns {string}
	 */
	String.prototype.normalize = function () {
		return this
			.replace(/\r/g, '\n')
			.replace(/\f/g, '\n\n') //разрыв страницы
			//It's adopted from trim() polyfill on https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/String/Trim 
			//and https://developer.mozilla.org/en/docs/Web/JavaScript/Guide/Regular_Expressions#special-white-space
			.replace(/[\t\v​\xA0\u1680​\u180e\u2000-\u200a​\u2028\u2029​\u202f\u205f​\u3000\ufeff]+/g, ' ')
			.replace(/\x20\x20+/g, ' ')
			//remove a spaces before and after new lines
			.replace(/\n\x20/g, '\n')
			.replace(/\x20\n/g, '\n')
			//replace 3 and more new lines to 2 new lines
			.replace(/\n\n\n+/g, '\n\n')
			.trim();
	}

	/**
	 * Removes soft hyphens and acute accents
	 * Вырезает мягкие дефисы знаки ударения
	 * 
	 * @returns {string}
	 */
	String.prototype.clean = function () {
		//&shy; = soft hyphen = discretionary hyphen
		//&acute; = acute accent = spacing acute
		return this.replace(/[\xAD\xB4]+/g, '');
	}

	/**
	 * Реализация метода String.match() с учётом рекурсии
	 * 
	 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/match
	 * @param {RegExp} pattern	Регулярное выражение должно быть сконструировано с группой с двумя или более альтернативами. Формат:
	 *							`(OpenPattern)|(ClosePattern)`
	 *							`(OpenPattern)|(ClosePattern)|InnerPattern|...`
	 * @param {Object} options	Объект с опциями. Пример: `{open: 1, close: 2, parts: true}`
	 *							`open` и `close` -- номера карманов для открывающего и закрывающего совпадений для регулярного выражения 
	 *							`parts` -- если true, то вместо строк возвращает объекты 
	 * @returns {array|string|null}	Если в регулярное выражение передан флаг `g`, то возвратит массив строк или пустое множество, если ничего не найдено
	 *								Если в регулярное выражение НЕ передан флаг `g`, то возвратит строку или `null`, если ничего не найдено
	 *								Если в опциях указан флаг `parts` то вместо вместо строк возвращает объекты в формате:
	 *								```
	 *								{
	 *									open: "открывающее_совпадение",
	 *									inner: "часть между открывающим и закрывающим совпадением", //здесь может быть пусто
	 *									close: "закрывающее_совпадение",
	 *								}
	 *								```
	 * @throws {Error} if maximum depth will be reached
	 */
	String.prototype.matchRecursive = function (pattern, options) {
		if (!(pattern instanceof RegExp)) throw TypeError('Function matchRecursive(), 1-nd parameter: a RegExp type expected, ' + (typeof options) + ' given!');
		if (typeof options !== 'object')  throw TypeError('Function matchRecursive(), 2-nd parameter: an object type expected, ' + (typeof options) + ' given!');
		var optProps = {
			open  : 'number',
			close : 'number',
			parts : 'boolean'
		};
		for (var prop in optProps) {
			if (typeof options[prop] !== optProps[prop]) 
				throw TypeError('Function matchRecursive(), 2-nd parameter: a ' + optProps[prop] + ' type expected in "' + prop + '" property in object, ' + (typeof options[prop]) + ' given!');
		}

		var match, depth = 0, depthMax = 1000, item = 0, result = [], s, isOpen, isClose, global = pattern.global;
		if (! global) pattern = RegExp(pattern.source, 'g' + (pattern.ignoreCase ? 'i' : '')
															+ (pattern.multiline ? 'i' : ''));

		while (match = pattern.exec(this)) {
			isOpen  = (typeof match[options.open]  === 'string');
			isClose = (typeof match[options.close] === 'string');
			if (isOpen) depth++;
			if (depth > 0) {
				if (depth > depthMax) throw Error(depthMax + ' depth has been reached');
				if (isOpen && !(item in result)) result[item] = options.parts ? {open: '', inner: '', close: ''} : '';
				s = this.substring(match.index, pattern.lastIndex);
				if (options.parts) {
					if (isOpen && depth === 1) result[item].open = s;
					else if (isClose && depth === 1) result[item].close = s;
					else result[item].inner += s;
				}
				else result[item] += s;
				if (depth === 1 && isClose) {
					if (! global) break;
					item++;
				}
			}
			if (isClose) depth--;
		}
		if (! global) return result ? result.pop() : null;
		return result;
	}
	
	/**
	 * Ищет в коде JavaScript первый массив или объект и возвращет его.
	 * Или, другими словами, возвращает текст от первой скобки `[{` до последней `]}` с учётом вложенности.
	 * Может быть использован для поиска JSON, но это это частный случай.
	 * Скобки `()` внутри JS допускаются, т.к. могут использоваться именованные или анонимные функции, например: 
	 * `o = {f : (function(a, b){return someFunc(a+b)})}`
	 * 
	 * @returns	{string|null}	Возвращает строку или `null`, если ничего не найдено
	 */
	String.prototype.getJsArrayOrObject = function () {
		if (false) { //development mode
			//http://hjson.org/
			//https://regex101.com/#javascript
			//http://blog.stevenlevithan.com/archives/match-innermost-html-element
			//We use atomic group (trick with lookahead, capturing group and link after) to speed improve, significantly reduce backtracking!
			var OPEN						= /([\{\[])/,	//group $1
				CLOSE						= /([\}\]])/,	//group $2
				ANY_WITH_EXCEPTIONS			= /(?= ([^\{\}\[\]"'`\/]+) )\1/,
				STRING_IN_DOUBLE_QUOTES		= /"				(?= ((?:[^"\\\r\n]+|\\.)*) )\1	"/,
				STRING_IN_SINGLE_QUOTES		= /'				(?= ((?:[^'\\\r\n]+|\\.)*) )\1	'/,
				STRING_IN_BACKTICK_QUOTES	= /`				(?= ((?:[^`\\]+    |\\.)*) )\1	`/,		//ECMA6+
				REGEXP_INLINE				= /\/	(?![\*\/])	(?= ((?:[^\/\\\r\n]+|\\[^\r\n])+) )\1	\/[gimy]{0,4}/,
				COMMENT_MULTILINE			= /\/\*				.*?								\*\//,
				COMMENT_SINGLELINE			= /\/\/				(?= ([^\r\n]*) )\1				/,
				ALL = XRegExp.union([
					OPEN,
					CLOSE,
					ANY_WITH_EXCEPTIONS,
					STRING_IN_DOUBLE_QUOTES,
					STRING_IN_SINGLE_QUOTES,
					STRING_IN_BACKTICK_QUOTES,
					REGEXP_INLINE,
					COMMENT_MULTILINE,
					COMMENT_SINGLELINE
				], 'xs');
			ALL = RegExp(ALL.source.replace(/\(\?:\)/g, ''), '');
			console.log(ALL);
		}
		else { //production mode
			var ALL = /([\{\[])|([\}\]])|(?=([^\{\}\[\]"'`\/]+))\3|"(?=((?:[^"\\\r\n]+|\\[\s\S])*))\4"|'(?=((?:[^'\\\r\n]+|\\[\s\S])*))\5'|`(?=((?:[^`\\]+|\\[\s\S])*))\6`|\/(?![\*\/])(?=((?:[^\/\\\r\n]+|\\[^\r\n])+))\7\/[gimy]{0,4}|\/\*[\s\S]*?\*\/|\/\/(?=([^\r\n]*))\8/;
		}

		try {
			return this.matchRecursive(ALL, {open: 1, close: 2, parts: false});
		} catch(e) {
			return null;
		}			
	}

})();