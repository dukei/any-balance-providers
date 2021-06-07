/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
const prefix={USD:'$', EUR:'€', GBP:'£', BYN:'Br', KZT:'T', CNY:'Ұ', UAH:'₴', CHF:'₣', JPY:'¥'}

function getRate(result, valut) {
	var CharCode=getParam(valut,/<CharCode>([^<]*)/);
        //var nominal=getParam(valut+' ',/<Nominal>([^<]*)/,null,parseBalance);
        result[CharCode]=getParam(valut+' ',/<Value>([^<]*)/,null,parseBalance);
        result[CharCode+'pref']=(prefix[CharCode]||CharCode)+' ';
}

function main() {
	AnyBalance.trace('Connecting to cbr...');
	
	var info = AnyBalance.requestGet('http://www.cbr.ru/scripts/XML_daily.asp');

	// Нужно для улучшения обработки ошибок в след версии
	//AnyBalance.trace(info);

	if(AnyBalance.getLastStatusCode() >= 500)
	    	var info = AnyBalance.requestGet('https://www.cbr-xml-daily.ru/daily_utf8.xml');

	if(AnyBalance.getLastStatusCode() >= 500)
	    throw new AnyBalance.Error('Сервер временно недоступен. Пожалуйста, попробуйте позже.');

	var result = {success: true};
	var matches=info.match(/<Valute[\s\S]*?<\/Valute>/g)
	//matches.map(valut=>getRate(result,valut));
	if (matches && matches.length>0)
		for (var i=0;i<matches.length;i++)
			getRate(result,matches[i])
	getParam(info, result, 'date',/Date="([^"]*)/);
	getParam(info, result, '__tariff',/Date="([^"]*)/);

	
	AnyBalance.setResult(result);
}


