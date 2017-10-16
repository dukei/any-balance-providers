/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var baseurl = "https://www.chelindbank.ru/ib2/";

var g_headers = {
    'Accept-Language': 'ru, en',
    Referer: baseurl + 'Logon.aspx',
    Origin: baseurl + 'Logon.aspx',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
}

function main(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var html = AnyBalance.requestPost(baseurl + 'Logon.aspx', {
        login:prefs.login,
        password:prefs.password,
        submit:'Submit'
    });

    if(!/action=logout/i.test(html)){
        var error = getElement(html, /<div[^>]*id="log[io]n_error/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /парол/i.test(html));
        throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
    }

    if(prefs.type == 'acc')
        fetchAccount(html);
    else
        fetchCard(html); //По умолчанию карты будем получать
}

function getAllAccounts(html){
	if(getAllAccounts.infos)
		return getAllAccounts.infos;

	var block = getElements(html, [/<div[^>]+id="block/ig, /Ваши счета/i])[0];
	if(!block){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти блок счетов и карт. Сайт изменен?');
	}

	var id = getParam(block, /<div[^>]+id="([^"]*)/i, replaceHtmlEntities);
	var action = getParam(html, /<input[^>]+name="actionid"[^>]*value="([^"]*)/i, replaceTagsAndSpaces);
	var params = {
		actionid: action,
		stepid:	'main',
		submit:	'aux',
		blockId:	id
	};
	params[id + '_data'] = 'undefined';

	html = AnyBalance.requestPost(baseurl + 'ref/Auxiliary.ashx', params, addHeaders({
		Referer: baseurl
	}));

	var table = getElement(html, /<tbody/i);
	var trs = getElements(table, /<tr/ig);
	AnyBalance.trace('Найдено ' + trs.length + ' счетов/карт');
	var infos = [];
	for(var i=0; i<trs.length; ++i){
		var tds = getElements(trs[i], /<td/ig);

		var info = {};
		info.typeName = replaceAll(tds[0], replaceTagsAndSpaces);
		info.isCard = /карт/i.test(info.typeName);
		info.accnum = getElement(tds[1], /<div[^>]+ui-lte-sm-hidden/i, replaceTagsAndSpaces);
		info.accname = getElement(tds[1], /<div[^>]+ui-gte-mid-hidden/i, replaceTagsAndSpaces);
		info.balance = getElement(tds[2], /<div[^>]+money/i, replaceTagsAndSpaces, parseBalance);
		info.currencyDN = getElement(tds[2], /<div[^>]+money/i, replaceTagsAndSpaces, parseCurrency);
		info.currency = replaceAll(tds[3], replaceTagsAndSpaces);
		info.cardname = replaceAll(tds[4], replaceTagsAndSpaces);
		info.cardnum = getParam(info.cardname, /\d{4,6}\.+\d{4}/);

		AnyBalance.trace('Найден счет ' + JSON.stringify(info));
		infos.push(info);
	}

	return getAllAccounts.infos = infos;
}

function fetchCard(html){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте", null, true);

    if(!fetchAccountOrCard(html))
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты'));
}

function fetchAccountOrCard(html){
    var prefs = AnyBalance.getPreferences();
	var infos = getAllAccounts(html);
	var isCard = prefs.type != 'acc';

	for(var i=0; i<infos.length; ++i){
		var info = infos[i];
		if(info.isCard == isCard && (!prefs.cardnum || endsWith(info.accnum, prefs.cardnum) || endsWith(info.cardnum, prefs.cardnum))){
    		var result = {success: true};
			getParam(info.cardnum, result, 'cardnum');
			getParam(info.balance, result, 'balance');
			getParam(info.currencyDN, result, ['currency', 'balance']);
			getParam(info.accnum, result, 'accnum');
			getParam(info.cardname || info.accname, result, '__tariff');
    		AnyBalance.setResult(result);
    		return true;
		}
	}
	return false;
}

function fetchAccount(html){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера счета или не вводите ничего, чтобы показать информацию по первому счету", null, true);
	
    if(!fetchAccountOrCard(html))
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'счет с первыми цифрами ' + prefs.cardnum : 'ни одного счета'));
}