function main(){
	var prefs = AnyBalance.getPreferences();
	var CardNumber = prefs.CardNumber;
	var info = AnyBalance.requestGet('http://www.krasinform.ru/?id=tcard&card_num='+CardNumber);

	if(info.search('Неверный номер транспортной карты') != -1){
		throw new AnyBalance.Error('Неверный номер транспортной карты');
	};

	var result = {success: true};
	var regexp1 = new RegExp('Количество транспортных единиц: (\\d*)');
	var regexp2 = new RegExp('Приемщик.*?<\\/td><td>([^<]*)<\\/td><td>.*?<\\/td><td>([^<]*)');
        var matches1, matches2;

	if(matches1 = info.match(regexp1)){
		if(AnyBalance.isAvailable('KolvoEdinits'))
			result.KolvoEdinits = parseFloat(matches1[1]);
		if(matches2 = info.match(regexp2)){
			if(AnyBalance.isAvailable('LastDate'))
				result.LastDate = matches2[1].substring(0,10);
			if(AnyBalance.isAvailable('LastSum'))
				result.LastSum = parseFloat(matches2[2]);
		};
	};

	AnyBalance.setResult(result);
}
