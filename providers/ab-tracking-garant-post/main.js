﻿
var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Encoding': 'gzip, deflate',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'
};

function main() {
	var baseurl = 'http://garantpost.ru/';

	var prefs = AnyBalance.getPreferences();
	AB.checkEmpty(prefs.code, 'Введите почтовый идентификатор!');

	AnyBalance.setDefaultCharset('windows-1251');

	var html = AnyBalance.requestGet(baseurl + 'tools/track', g_headers);

	html = AnyBalance.requestPost(baseurl + 'tools/track', {
		barcode_paxel_number: prefs.code,
		x: 40,
		y: 8,
	}, AB.addHeaders({ Referer: baseurl + 'tools/track' }));

	if (/<form[^>]+\/tools\/track/i.test(html)) {
		throw new AnyBalance.Error('Неверный почтовый идентификатор!');
	}

	var result = { success: true };
	//AB.getParam(html, result, 'direct', new RegExp(prefs.code + '[^<]*<[^>]+>[^<]*<[^>]+>([^<]+)', 'i'), AB.replaceTagsAndSpaces, AB.html_entity_decode);

	html = html.replace(/\n/g, '');

	var table = html.match(/<table[^>]+tnt[^>]+>((?:.(?!\/table>))+)/i);
	if(!table){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти таблицу с данными. Сайт изменен?');
	}
	// Получили таблицу, и теперь получим все tr
	var tr = table[1].match(/<tr[^>]*>((?:.(?!\/tr>))+)/ig);
	if (!tr) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить строки из таблицы. Сайт изменен?');
	}

	var data = [];
	tr.forEach(function (lineStr, i) {
		var line = lineStr.match(/<td[^>]*>((?:.(?!\/td>))*)/ig);
		if (line) {
			data.push(
				line.map(function (cell) {
					return AB.getParam(cell, null, null, null, AB.replaceTagsAndSpaces, AB.html_entity_decode);
				})
			);
		}
	});
	if (data[0][0] == prefs.code) {
		var first = data.shift();
		getParam(first[1], result, 'direct');
		var last = data.pop();
		if (data.length > 1 && last.length == 5) {
			//дата/время
			//событие
			//место ввода информации *
			//комментарий
			//в получении расписался
			getParam(last[0], result, 'date');
			getParam(last[1], result, 'event');
			getParam(last[2], result, 'place');
			getParam(last[3], result, 'comment');
			getParam(last[4], result, 'sign');
		}
	}
	else {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти информацию по отправлению ' + prefs.code + '. Сайт изменен?');
	}

	AnyBalance.setResult(result);
	return;
}
