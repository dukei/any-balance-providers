function main(){
	AnyBalance.trace('main started', null);
	var prefs = AnyBalance.getPreferences();
	var cardnumber = prefs.cardnumber;
	AnyBalance.trace(cardnumber, null);
	
	var info = AnyBalance.requestPost('https://pay.brsc.ru/Alga.pay/GoldenCrownSite.php', {cardnumber: cardnumber});
	
	var result = {success:true};

	lu = AnyBalance.getLastUrl(); //нужная инфа в параметрах url после перенаправления
	
	if (matches = lu.match(/allow=(.*)&/)){
		var allow = matches[1];
		if (allow === 'yes'){
			if (bmatches = lu.match(/sum=(.*)/)){
				result.balance = Number(bmatches[1]);
			}
		}else if (allow === 'no'){
			result = {error: true, fatal: true};
			if (mmatches = lu.match(/message=(.*)/)){
				result.message = decodeURI(mmatches[1]).replace(/\+/g, ' ');
			}
		}else{
			result = {error: true, message: 'unknown error'};
		}
		
	}else{
		result = {error: true, message: 'unknown error'};
	}

	AnyBalance.setResult(result);
}