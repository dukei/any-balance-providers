/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();

    baseurl= 'https://stat.pautina.ua/ua/i';
    if (parseInt(prefs.login.substr(0,1)) < 6)
    baseurl= 'https://stat.pautina.net.ua/ua/i';

    var d = new Date();
    var gm = d.getMonth();
    var gd = d.getDate();
    var gy = d.getYear();
    var ses=gd+""+gm+""+gy;
    var pp = hex_md5(ses+" "+prefs.password);
    var html=AnyBalance.requestGet(baseurl+'?&uu='+prefs.login+'&pp='+pp);

	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	if (!/АККАУНТ : /i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	getParam(html, result, 'balance', /Баланс[\s\S]*?<h[32]>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', /Бонуси[\s\S]{1,30}<h[32]>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'abon', /Загальна вартість послуг[\s\S]*?h[32][^<]*?>([\d\.,\s]+)?<\/h[32]/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'recomend', /в поточному місяці[\s\S]*?(<h[432][\s\S]*?<\/h[432]>)/i, [replaceTagsAndSpaces,replaceHtmlEntities]);
	getParam(html, result, 'recomend_next', /на наступний місяць[\s\S]*?(<h[432][\s\S]*?<\/h[432]>)/i, [replaceTagsAndSpaces,replaceHtmlEntities]);
	getParam(html, result, 'fio', /&a=101&a=100">([\s\S]*?)<\/h6/i, [replaceTagsAndSpaces,replaceHtmlEntities]);
	getParam(html, result, 'amount', /АККАУНТ[\s\S]*?<b>([\s\S]*?)<\/b/i, [replaceTagsAndSpaces,replaceHtmlEntities]);
	getParam(html, result, '__tariff', /[\s\S]*<span>([\s\S]*)<\/span>/i, [replaceTagsAndSpaces,replaceHtmlEntities]);
	AnyBalance.setResult(result);
}
