/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'Origin':'https://iclick.imoneybank.ru',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:23.0) Gecko/20100101 Firefox/23.0'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://iclick.imoneybank.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	var found = /(\d{3})(\d{3})(\d{2})(\d{2})/i.exec(prefs.login);
	if(found)
		var phoneNumber = '+7 (' + found[1] + ') ' + found[2] + '-' + found[3] + '-' + found[4];
	else
		throw new AnyBalance.Error('Введите логин! Логин должен быть в формате 9001234567!');
	
	var token = getParam(html, null, null, /"_token"[^>]*value="([^"]*)/i);
	html = AnyBalance.requestPost(baseurl + 'login', {
        '_cellphone':phoneNumber,
		'submit':'',
		'_token':token
    }, addHeaders({Referer: baseurl + 'login'}));

	html = AnyBalance.requestPost(baseurl + 'login_check', {
		'_cellphone':phoneNumber,
		'_password':prefs.password,
		'submit':'',
		'_token':token
    }, addHeaders({Referer: AnyBalance.getLastUrl()}));

    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	var result = {success: true};
	
	var cardsTable = getParam(html, null, null, /<span>Карты<\/span>[^>]*>\s*(<table[\s\S]*?<\/table>)/i);
	
	
	(<tr\s*>[\s\S]*?(?!<th>)</tr>)
	
	
	//(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)</
	
	
	
	
	/*// карты
	html = AnyBalance.requestGet(baseurl + 'accounts/imoney-cards', g_headers);
	var json = getJson(html);
	
	
	// Читаем в цикле
	for(var i = 0; i < json.accounts.length; i++)
	{
		var current = json.accounts[i];
		result.balance = parseBalance(current.balance+'');
		result.type = current.accountType;
		result.deadline = parseDate(current.expiry);
		result.acc_num = current.accountNumber
		result.card_num = result.__tariff = current.maskedNumber
		// Убрать, пока нет смысла читать цикл, возьмем первую карту
		break;
	}*/
    AnyBalance.setResult(result);
}