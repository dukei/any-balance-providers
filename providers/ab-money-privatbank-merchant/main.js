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
	var baseurl=['https://veloaccs.com.ua/anybalance/privat/index.php?',
		     'https://anybalance.000webhostapp.com/?'];
	var prefs = AnyBalance.getPreferences();
	result={success: true};
	var errorsCount=0;
	for (n in baseurl){
		var d=new Date(AnyBalance.getData('NoCheck'+n))
		if (d>new Date()){
			AnyBalance.trace(baseurl[n]+' пропущен. Не проверятся до '+getFormattedDate('DD.MM.YYYY HH:NN',d));
			continue;
		}
		try {
			getPrivatBalances(baseurl[n]);
		}catch(e){
			AnyBalance.trace('Ошибка при проверке '+baseurl[n]+':\n'+e.message);
			if (/invalid ip:/.test(e.message)){
				var d=new Date();
                                d.setDate(d.getDate() + 10)
				AnyBalance.trace(baseurl[n]+'не будет проверяться 10 дней. До '+getFormattedDate('DD.MM.YYYY HH:NN',d));
				AnyBalance.setData('NoCheck'+n,d);
                                AnyBalance.saveData();
				}else{errorsCount+=1};
		}
	}
	if (errorsCount==baseurl.length) throw new AnyBalance.Error('Балансы не получены. Список ошибок в логе');
        result.__tariff='🔁 '+getFormattedDate('DD.MM.YYYY HH:NN');
        AnyBalance.setResult(result);

   function getPrivatBalances(baseurl){
	var goodBalances=0;
	var errorText='';
	var curErr='';
	   for (var c in prefs){
        	var responce='';
		if (prefs[c].length>55 && AnyBalance.isAvailable(c)) {
		    try{
		    	var resp=AnyBalance.requestGet(baseurl+(prefs[c].replace(/[^0-9A-Z]+/ig,"&")));
		    }catch(e){
		    	AnyBalance.trace(e.mesage);
		    	continue;
		    }
                    var curErr=getElementById(resp, 'error',replaceTagsAndSpaces);
                    if (!curErr){
			getParam(getElementById(resp,'balance',replaceTagsAndSpaces), result, c, null, null, parseBalance);
			if (prefs.showLimit>0){
				var fin_limit=getElementById(resp,'fin_limit',replaceTagsAndSpaces,parseBalance);
				if (fin_limit){
				   if (prefs.showLimit==1) 
					result['suf_'+c]='+'+fin_limit;
                                   else if (prefs.showLimit==2) 
                                   	result[c]+=fin_limit;
				}
			}
			var currency=getElementById(resp,'currency',replaceTagsAndSpaces);
			if (currency=='UAH'){
                           currency='₴';
                           if (!result.balance) result.balance=0;
                           result.balance+=result[c];
			}
                        if (currency && prefs.needValut) 
                        	result['suf_'+c]=(result['suf_'+c]?result['suf_'+c]+' '+currency:' '+currency);
                        goodBalances+=1;
                    }else{
                    	AnyBalance.trace("Ошибка при чтении баланса карты " + cards[c]);
                    	AnyBalance.trace(curErr);
                    	errorText=cards[c]+': '+curErr;
                    }
		}
	   }
        if (errorText && !goodBalances) throw new AnyBalance.Error(errorText);
   }
}
