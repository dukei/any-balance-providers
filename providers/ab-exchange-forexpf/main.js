/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

function tryGetHistory(result, value) {
	try {
		var now = Math.floor(+new Date()/1000);
		var vn = value.replace(/\//g, '');
		var headers = (typeof addHeaders === 'function') ? addHeaders({Referer: "https://www.profinance.ru/" + vn.toLowerCase()}) : g_headers;
		var url = "https://charts.profinance.ru/html/tw/history?symbol=" + encodeURIComponent(value) + "&resolution=1&from=" + (now - 3600) + "&to=" + now;
		var text = AnyBalance.requestGet(url, headers);
		if (text && text.indexOf('{') >= 0) {
			var json = JSON.parse(text);
			if (json && json.l && json.l.length > 0 && json.h && json.h.length > 0) {
				getParam(json.l[json.l.length-1], result, vn + '_bid');
				getParam(json.h[json.h.length-1], result, vn + '_ask');
				return true;
			}
		}
	} catch(e) {
		AnyBalance.trace("Charts endpoint failed for " + value + ": " + e.message);
	}
	return false;
}

function parseRate(str) {
	if (!str) return null;
	var s = ('' + str).replace(/\s+/g, '').replace(/,/g, '.');
	var m = s.match(/[\d.]+/);
	return m ? parseFloat(m[0]) : null;
}

function parseFromHtml(html, result, pairName) {
	var vn = pairName.replace(/\//g, '');
	var reg = new RegExp(pairName.replace('/', '[\\/\\s]') + '[^<]*<\\/td>\\s*<td[^>]*>([\\d\\s.,]+)<\\/td>\\s*<td[^>]*>([\\d\\s.,]+)<\\/td>', 'i');
	var match = html.match(reg);
	if (!match) {
		reg = new RegExp(pairName.replace('/', '[\\/\\s]') + '[^\\d]*([\\d]+[.,][\\d]+)[^\\d]+([\\d]+[.,][\\d]+)', 'i');
		match = html.match(reg);
	}
	if (match) {
		var bid = parseRate(match[1]);
		var ask = parseRate(match[2]);
		if (bid !== null) {
			if (typeof getParam === 'function') {
				getParam(bid, result, vn + '_bid');
			} else {
				result[vn + '_bid'] = bid;
			}
		}
		if (ask !== null) {
			if (typeof getParam === 'function') {
				getParam(ask, result, vn + '_ask');
			} else {
				result[vn + '_ask'] = ask;
			}
		}
		return true;
	}
	return false;
}

function getCurrent(result, value) {
	if (tryGetHistory(result, value)) {
		return;
	}

	AnyBalance.trace("Загрузка котировок с главной страницы profinance.ru для " + value);
	var html = AnyBalance.requestGet("https://www.profinance.ru/", g_headers);
	if (html && parseFromHtml(html, result, value)) {
		return;
	}

	html = AnyBalance.requestGet("https://www.profinance.ru/quote_show.php", g_headers);
	if (html && parseFromHtml(html, result, value)) {
		return;
	}

	var pairSlug = value.replace(/\//g, '').toLowerCase();
	html = AnyBalance.requestGet("https://www.profinance.ru/chart/" + pairSlug + "/", g_headers);
	if (html && parseFromHtml(html, result, value)) {
		return;
	}

	AnyBalance.trace("Не удалось получить курсы для " + value);
}

function main() {
	AnyBalance.setDefaultCharset('utf-8');
	var result = {success: true};

	getCurrent(result, 'USD/RUB');
	getCurrent(result, 'EUR/RUB');

	if (!result.USDRUB_bid && !result.USDRUB_ask && !result.EURRUB_bid && !result.EURRUB_ask) {
		throw new AnyBalance.Error("Не удалось получить курсы валют с сервиса profinance.ru");
	}

	AnyBalance.setResult(result);
}
