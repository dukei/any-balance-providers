/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function getRateDate(result, info) {
	var matches, regexp = /span id=\"exchangeDate\"\>([\d\.]*?)<\/span>/i;
	if (matches = info.match(regexp)) {
		if (AnyBalance.isAvailable('date')) {
			result.date = matches[1];
			result.__tariff = matches[1];
		}
	}
}

function getRate(result, info, namein) {
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
var shorts = {
	UAH: "₴",
	USD: "$",
	EUR: "€",
	GBP: "£",
	BYN: "Br",
	KZT: "〒",
	CHF: "₣",
	CNY: "Ұ",
	JPY: "¥",
	PLN: "zl",
	RUB: "₽",
        CZK: "Kč"
};

function main() {
	if (AnyBalance.getLevel() < 5) return "Для этого провайдера необходимо AnyBalance API v.5+";
	AnyBalance.trace('Connecting to nbu...');
	var info = AnyBalance.requestGet('https://bank.gov.ua/ua/markets/exchangerates?period=daily');
	
	var result = {success: true};
	
	'USD EUR GBP RUB BYN KZT CHF CNY JPY AUD AZN DKK CAD MDL NOK PLN SGD XDR HUF CZK SEK BGN KRW HKD EGP INR HRK MXN ILS NZD ZAR RON IDR SAR TRY'.split(' ').forEach(valut => getRate(result, info, valut));
	
	getRateDate(result, info);
	
	AnyBalance.setResult(result);
}
