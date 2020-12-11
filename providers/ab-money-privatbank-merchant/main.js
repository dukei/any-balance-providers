/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var cards = {
corp: "Корпоративная",
pay: "Карта для выплат",
unior: "Карта юниора",
kluch: "Ключ к счету",
univers: "Универсальная",
USD: "Карта USD",
EUR: "Карта EUR",
ZP: "Зарплатная",
PENS: "Пенсионная",
SOTS: "Соц.выплаты",
virt: "Виртуальная"
};

function main() {
	var prefs = AnyBalance.getPreferences();
	result={success: true};
	var goodBalances=0;
	var errorText='';
	var curErr='';
	for (var c in prefs){
        	var responce='';
		if (prefs[c].length>55 && AnyBalance.isAvailable(c)) {
                var resp=AnyBalance.requestGet('https://anybalance.000webhostapp.com/?'+(prefs[c].replace(/[^0-9A-Z]+/ig,"&")));
                    var curErr=getParam(resp, null, null, /id="error">([\s\S]*?)<\/div/i);
                    if (!curErr || curErr==''){
			getParam(resp, result, c, /id="balance">([\d\.]*)<\/div/i, null, parseBalance);
			if (prefs.needLimit){
				var fin_limit=getParam(resp, null, null, /id="fin_limit">([\d\.]*)<\/div/i, null, parseBalance);
				if (fin_limit)  result['suf_'+c]='+'+fin_limit;
			}
			var currency=getParam(resp, null, null, /id="currency">([A-Z]*?)<\/div/i);
			if (currency=='UAH'){
                           currency='₴';
                           if (!result.balance) result.balance=0;
                           result.balance+=result[c];
			}
                        if (currency && prefs.needValut) result['suf_'+c]=(result['suf_'+c]?result['suf_'+c]+' '+currency:' '+currency);
                    goodBalances+=1;
                    }else{
                    	AnyBalance.trace("Ошибка при чтении баланса карты " + cards[c]);
                    	AnyBalance.trace(curErr);
                    	errorText=cards[c]+': '+curErr;
                    }
		}
	}
        result.__tariff=getFormattedDate('DD.MM.YYYY HH:NN');
        if (errorText && !goodBalances) throw new AnyBalance.Error(errorText);
        AnyBalance.setResult(result);
}
