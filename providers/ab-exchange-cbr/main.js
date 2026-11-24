/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var PREFIX = {
	USD: '$',
	EUR: '€',
	GBP: '£',
	BYN: 'Br',
	KZT: '₸',
	CNY: 'CN¥',
	UAH: '₴',
	CHF: '₣',
	JPY: 'JP¥',
	AMD: '֏',
	AUD: 'A$',
	AZN: '₼',
	BGN: 'лв',
	BRL: 'R$',
	CAD: 'C$',
	CZK: 'Kč',
	DKK: 'kr',
	HKD: 'HK$',
	HUF: 'Ft',
	INR: '₹',
	KGS: 'с',
	KRW: '₩',
	MDL: 'L',
	NOK: 'kr',
	PLN: 'zł',
	RON: 'lei',
	SEK: 'kr',
	SGD: 'S$',
	TJS: 'SM',
	TMT: 'm',
	TRY: '₺',
	UZS: 'soʻm',
	XDR: 'XDR',
	ZAR: 'R'
};

function getRate(result, valute) {
	var CharCode = getParam(valute, /<CharCode>([^<]*)<\/CharCode>/);
	if (!CharCode) {
		AnyBalance.trace('Не найден CharCode в блоке Valute');
		return false;
	}

	// Nominal не используется — так задумано.
	// var nominal = getParam(valute + ' ', /<Nominal>([^<]*)/, null, parseBalance);
	var value = getParam(valute + ' ', /<Value>([^<]*)<\/Value>/, null, parseBalance);

	if (typeof value != 'number' || isNaN(value)) {
		AnyBalance.trace('Не удалось разобрать Value для ' + CharCode);
		return false;
	}

	result[CharCode] = value;
	result[CharCode + 'pref'] = (PREFIX[CharCode] || CharCode) + ' ';
	return true;
}

function loadRatesXml() {
	var urls = [
		'https://www.cbr.ru/scripts/XML_daily.asp',
		'https://www.cbr-xml-daily.ru/daily_utf8.xml'
	];
	var headers = {
		'User-Agent': 'Mozilla/5.0 (compatible; AnyBalance)',
		'Accept': 'application/xml,text/xml,*/*'
	};
	var lastError = '';

	for (var i = 0; i < urls.length; i++) {
		try {
			AnyBalance.trace('Запрос курсов: ' + urls[i]);
			var info = AnyBalance.requestGet(urls[i], headers);
			var status = AnyBalance.getLastStatusCode();

			AnyBalance.trace('HTTP ' + status + ', длина ответа ' + info.length);

			if (status < 400 && /<Valute[\s\S]*?<\/Valute>/.test(info))
				return info;

			lastError = 'HTTP ' + status + ' / неожиданный формат';
		} catch (e) {
			lastError = e && e.message ? e.message : String(e);
			AnyBalance.trace('Ошибка запроса: ' + lastError);
		}
	}

	throw new AnyBalance.Error('Не удалось получить курсы валют ЦБ РФ: ' + lastError);
}

function main() {
	AnyBalance.trace('Connecting to cbr...');

	var info = loadRatesXml();
	var result = {success: true};
	var matches = info.match(/<Valute[\s\S]*?<\/Valute>/g);

	if (!matches || !matches.length)
		throw new AnyBalance.Error('В ответе ЦБ РФ не найдены курсы валют.');

	var parsed = 0;
	for (var i = 0; i < matches.length; i++) {
		if (getRate(result, matches[i]))
			parsed++;
	}

	if (!parsed)
		throw new AnyBalance.Error('Не удалось разобрать ни одного курса валют.');

	getParam(info, result, 'date', /Date="([^"]*)"/);
	getParam(info, result, '__tariff', /Date="([^"]*)"/);

	AnyBalance.setResult(result);
}