var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Content-Type':'text/html; charset=UTF-8',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36'
	};
function main(){  

	var prefs = AnyBalance.getPreferences();	
	var baseurl = 'https://lk2.stupino.su/';
	AnyBalance.setDefaultCharset('utf-8');
	
	
	var html = requestPostMultipart(baseurl, {
        action_id: 'AUTH',
        contract: prefs.dogovor,
        passwd1: prefs.password,
		}, addHeaders({
    	Referer: baseurl
	}));

	if(!/выход/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+id="err_msg[^style.]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /<td>Владелец договора<\/td>\s*<td>([\s\S]*?)&nbsp;<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'id', /<td>Номер договора<\/td>\s*<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /<td>Текущий баланс<\/td>\s*<td>([\s\S]*?) руб<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'ip', /<td>IP-адрес<\/td>\s*<td>([\s\S]*?)&nbsp;<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /<td>Авторизация<\/td>\s*<td>([\s\S]*?)&nbsp;<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'tarif', /<td>Тарифный план<\/td>\s*<td>([\s\S]*?)<div[^>]/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}
