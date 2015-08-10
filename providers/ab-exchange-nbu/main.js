/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function getRateDate(result, info) {
	var matches, regexp = /<td[^>]+class="date"[^>]*>([\s\S]*?)<\/td>/i;
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
		var matches, regexpValue = new RegExp('<tr[^>]*>\\s*<td[^>]*>[^<]*</td>\\s*<td[^>]*>' + namein + '(?:[\\s\\S]*?<td[^>]*>){3}([^<]*)', 'i'),
			regexpMul = new RegExp('<tr[^>]*>\\s*<td[^>]*>[^<]*</td>\\s*<td[^>]*>' + namein + '(?:[\\s\\S]*?<td[^>]*>){1}([^<]*)', 'i');
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
	BYR: "Br",
	KZT: "〒",
	CHF: "₣",
	CNY: "Ұ",
	JPY: "¥",
	RUB: "р"
};

function main() {
	if (AnyBalance.getLevel() < 5) return "Для этого провайдера необходимо AnyBalance API v.5+";
	AnyBalance.trace('Connecting to nbu...');
	var info = AnyBalance.requestGet('http://bank.gov.ua/control/uk/curmetal/detail/currency?period=daily');
	
	var result = {success: true};
	
	getRate(result, info, 'AUD');
	getRate(result, info, 'AZM');
	getRate(result, info, 'GBP');
	getRate(result, info, 'BYR');
	getRate(result, info, 'DKK');
	getRate(result, info, 'USD');
	getRate(result, info, 'EUR');
	getRate(result, info, 'ISK');
	getRate(result, info, 'KZT');
	getRate(result, info, 'CAD');
	getRate(result, info, 'LVL');
	getRate(result, info, 'LTL');
	getRate(result, info, 'MDL');
	getRate(result, info, 'NOK');
	getRate(result, info, 'PLN');
	getRate(result, info, 'RUB');
	getRate(result, info, 'SGD');
	getRate(result, info, 'XDR');
	getRate(result, info, 'TRL');
	getRate(result, info, 'TMM');
	getRate(result, info, 'HUF');
	getRate(result, info, 'UZS');
	getRate(result, info, 'CZK');
	getRate(result, info, 'SEK');
	getRate(result, info, 'CHF');
	getRate(result, info, 'CNY');
	getRate(result, info, 'JPY');
	getRateDate(result, info);
	
	AnyBalance.setResult(result);
}