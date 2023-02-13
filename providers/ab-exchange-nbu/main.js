/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function getRateDateOfficial(result, info) {
	var matches, regexp = /span id=\"exchangeDate\"\>([\d\.]*?)<\/span>/i;
	if (matches = info.match(regexp)) {
		result.__tariff = matches[1];
		if (AnyBalance.isAvailable('date')) {
			result.date = matches[1];
		}
	}
}

function getRateDateFinmarket(result, html) {
	var date = getParam(html, null, null, /<caption[^>]*>[\s\S]*?\sна\s([\s\S]*?)<\/caption>/i, [replaceTagsAndSpaces, /(\d{1,2})\s+(\S+)\s+(\d{4})\s+(.*)/, '$1.$2.$3',
      'января', '01',
      'февраля', '02',
      'марта', '03',
      'апреля', '04',
      'мая', '05',
      'июня', '06',
      'июля', '07',
      'августа', '08',
      'сентября', '09',
      'октября', '10',
      'ноября', '11',
      'декабря', '12'
  ]);
	if (date) {
		result.__tariff = date;
		if (AnyBalance.isAvailable('date')) {
			result.date = date;
		}
	}
}

function getRateDateBigMir(result, html) {
	var date = getParam(html, null, null, /<time\s*datetime="([^"]*)/i, [replaceTagsAndSpaces, /(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1']);
	if (date) {
		result.__tariff = date;
		if (AnyBalance.isAvailable('date')) {
			result.date = date;
		}
	}
}

function getRateOfficial(result, info, namein) {
	if (AnyBalance.isAvailable(namein)) {
		var prefs = AnyBalance.getPreferences();
		var matches, regexpValue = new RegExp('Код літерний[\\s\\S]*?' + namein + '[\\s\\S]*?Офіційний курс\\"\\>([\\d\\.\\,]*)<\\/td>', 'i'),
			regexpMul = new RegExp('Код літерний[\\s\\S]*?' + namein + '[\\s\\S]*?Кількість одиниць валюти\\"\\>([\\d]*)<\\/td>', 'i');
		if (matches = info.match(regexpValue)) {
			var val = parseFloat(matches[1].replace(',', '.'));
			if (prefs.normalize) {
				matches = info.match(regexpMul);
				var mul = parseInt(matches[1]) || 1;
				val /= mul;
				if (val >= 1) {
					//Если курс больше единицы, то так и оставляем, он комфортен
					result['suf' + namein] = ' ' + shorts.UAH + '/' + (shorts[namein] || namein);
				} else {
					//Если курс меньше единицы, то лучше инвертировать его
					val = 1 / val;
					result['suf' + namein] = ' ' + (shorts[namein] || namein) + '/' + shorts.UAH;
				}
				val = Math.round(val * 100) / 100;
			} else {
				result['pre' + namein] = (shorts[namein] || namein) + " ";
			}
			result[namein] = val;
		}
	}
}

function getRateFinmarket(result, valut, namein) {
	var prefs = AnyBalance.getPreferences();
	var namein = getParam(valut, /(?:<td[\s\S]*?[^>]*>){1}([\s\S]*?)<\/td>/);
	if (AnyBalance.isAvailable(namein)) {
   	    var val = getParam(valut + ' ', /(?:<td[\s\S]*?[^>]*>){4}([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
    	if (prefs.normalize) {
			var mul = getParam(valut + ' ', /(?:<td[\s\S]*?[^>]*>){3}([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
			val /= mul;
			if (val >= 1) {
				//Если курс больше единицы, то так и оставляем, он комфортен
				result['suf' + namein] = ' ' + shorts.UAH + '/' + (shorts[namein] || namein);
			} else {
				//Если курс меньше единицы, то лучше инвертировать его
				val = 1 / val;
				result['suf' + namein] = ' ' + (shorts[namein] || namein) + '/' + shorts.UAH;
			}
			val = Math.round(val * 100) / 100;
		} else {
			result['pre' + namein] = (shorts[namein] || namein) + " ";
		}
		result[namein] = val;	
    }	
}

function getRateBigMir(result, valut, namein) {
	var prefs = AnyBalance.getPreferences();
	var namein = getParam(valut, /<td>(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/);
	if (AnyBalance.isAvailable(namein)) {
   	    var val = getParam(valut + ' ', /<td>(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
    	if(/INR|RUB|JPY/i.test(namein)){
				val = val*10;
			}else if(/HUF|KRW|KZT/i.test(namein)){
				val = val*100;
			}else if(/IDR/i.test(namein)){
				val = val*1000;
			}
		if (prefs.normalize) {
			var mul = getParam(valut + ' ', /<td>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
		    if(/INR|RUB|JPY/i.test(namein)){
				mul = 10;
			}else if(/HUF|KRW|KZT/i.test(namein)){
				mul = 100;
			}else if(/IDR/i.test(namein)){
				mul = 1000;
			}
			val /= mul;
			if (val >= 1) {
				//Если курс больше единицы, то так и оставляем, он комфортен
				result['suf' + namein] = ' ' + shorts.UAH + '/' + (shorts[namein] || namein);
			} else {
				//Если курс меньше единицы, то лучше инвертировать его
				val = 1 / val;
				result['suf' + namein] = ' ' + (shorts[namein] || namein) + '/' + shorts.UAH;
			}
			val = Math.round(val * 100) / 100;
		} else {
			result['pre' + namein] = (shorts[namein] || namein) + " ";
		}
		result[namein] = val;	
    }	
}

var shorts = {
	UAH: "₴",
	USD: "$",
	EUR: "€",
	GBP: "£",
	BYN: "Br",
	KZT: "₸",
	CHF: "₣",
	CNY: "Ұ",
	JPY: "¥",
	PLN: "zł",
	RUB: "₽",
    CZK: "Kč"
};

function main() {
	var prefs = AnyBalance.getPreferences();
	if (AnyBalance.getLevel() < 5) return "Для этого провайдера необходимо AnyBalance API v.5+";
	
	switch(prefs.source){
    case 'site':
        mainOfficial();
        break;
	case 'finmarket':
        mainFinmarket();
        break;
    case 'bigmir':
        mainBigMir();
        break;
    case 'auto':
    default:
        try{
			mainOfficial();
        }catch(e){
            if(e.fatal)
                throw e;
			AnyBalance.trace('Не удалось получить данные с сервера НБУ: ' + e.message + ' (' + e.stack + ')');
		    clearAllCookies();
            try{
			    mainFinmarket();
			}catch(e){
                if(e.fatal)
                    throw e;
		    	AnyBalance.trace('Не удалось получить данные с сайта Финмаркет: ' + e.message + ' (' + e.stack + ')');
		        clearAllCookies();
                mainFinmarket();
            }
        }
        break;
	}
}

function mainOfficial() {
	AnyBalance.trace('Подключаемся к серверу НБУ...');
	
	var info = AnyBalance.requestGet('https://bank.gov.ua/ua/markets/exchangerates?period=daily');
	AnyBalance.trace('info: ' + info);
	
	var result = {success: true};
	
	'USD EUR GBP RUB BYN KZT CHF CNY JPY AUD AZN DKK CAD MDL NOK PLN SGD XDR HUF CZK SEK BGN KRW HKD EGP INR HRK MXN ILS NZD ZAR RON IDR SAR TRY'.split(' ').forEach(valut => getRateOfficial(result, info, valut));
	
	getRateDateOfficial(result, info);
	
	setCountersToNull(result);
	
	AnyBalance.setResult(result);
}

function mainFinmarket() {
	AnyBalance.trace('Подключаемся к сайту Финмаркет...');
    
    var html = AnyBalance.requestGet('http://www.finmarket.ru/currency/rates/?id=10134');
	var info = getElement(html, /<tbody[^>]*>/i);
	
	var result = {success: true};
	
	var matches = info.match(/<tr[\s\S]*?<\/tr>/g)
    
	if (matches && matches.length > 0){
		for (var i=0; i<matches.length; i++)
			getRateFinmarket(result, matches[i])
	}
	
	getRateDateFinmarket(result, html);
	
	setCountersToNull(result);
	
	AnyBalance.setResult(result);
}

function mainBigMir() {
	AnyBalance.trace('Подключаемся к порталу Bigmir)net...');
    
    var html = AnyBalance.requestGet('https://finance.bigmir.net/2888099-nbu');
	var info = getElement(html, /<tbody[^>]*>/i);
	
	var result = {success: true};
	
	var matches = info.match(/<tr[\s\S]*?<\/tr>/g)
    
	if (matches && matches.length > 0){
		for (var i=0; i<matches.length; i++)
			getRateBigMir(result, matches[i])
	}
	
	getRateDateBigMir(result, html);
	
	setCountersToNull(result);
	
	AnyBalance.setResult(result);
}
