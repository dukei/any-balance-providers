// BTC wallet validation, BTC wallets are 27 to 34 long, alphanumeric and must start with either 1 or 3
function validateBtcWallet(wallet) 
{
	if (typeof(wallet)=="undefined")
		throw new AnyBalance.Error("Please enter your BTC wallet!");
	if ((wallet.length<27) || (wallet.length>34))
		throw new AnyBalance.Error("Invalid BTC wallet, must be 27 to 34 characters long!");
	if (/[^a-zA-Z0-9]/.test(wallet))
		throw new AnyBalance.Error("Invalid BTC wallet, must contain alphanumeric characters only!");
	if ((wallet[0]!='1') && (wallet[0]!='3'))
		throw new AnyBalance.Error("Invalid BTC wallet, must begin with either '1' or '3'!");
}