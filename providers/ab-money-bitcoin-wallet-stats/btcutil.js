// BTC wallet validation
// Supported address types:
// 1...  - Legacy P2PKH
// 3...  - P2SH
// bc1q... - Native SegWit
// bc1p... - Taproot
function validateBtcWallet(wallet)
{
	if (typeof(wallet)=="undefined" || wallet=="")
		throw new AnyBalance.Error("Please enter your BTC wallet!");

	wallet = wallet.trim();

	// Legacy P2PKH / P2SH
	if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,33}$/.test(wallet))
		return;

	// Native SegWit / Taproot
	if (/^bc1[qp][ac-hj-np-z02-9]{38,58}$/.test(wallet.toLowerCase()))
		return;

	throw new AnyBalance.Error("Invalid BTC wallet address!");
}


// BTC exchange rate from Blockchain.com
function getBIExchangeRate(currency)
{
	currency = currency.toUpperCase();

	if (currency.match(/^[A-Z]{3}$/)==null)
		throw new AnyBalance.Error("currency code must be 3 characters long, English letters only");

	var json = AnyBalance.requestGet(
		'https://blockchain.info/ticker',
		g_headers
	);

	try
	{
		json = JSON.parse(json);
	}
	catch(error)
	{
		AnyBalance.trace(json);
		throw new AnyBalance.Error("blockchain.info: could not get exchange rate");
	}

	if (!json || typeof json[currency] == "undefined")
		throw new AnyBalance.Error("blockchain.info: currency " + currency + " is not supported");

	if (typeof json[currency].buy != "number")
		throw new AnyBalance.Error("blockchain.info: invalid exchange rate for " + currency);

	return {
		rate: json[currency].buy,
		currency: json[currency].symbol
	};
}


function getExchangeRate(currency)
{
	return getBIExchangeRate(currency);
}