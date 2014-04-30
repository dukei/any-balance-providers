/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
}

function sleep(delay) {
   if(AnyBalance.getLevel() < 6){
      var startTime = new Date();
      var endTime = null;
      do {
          endTime = new Date();
      } while (endTime.getTime() - startTime.getTime() < delay);
   }else{
      AnyBalance.sleep(delay);
   }
} 

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://retail.sdm.ru/";
    
    var html = AnyBalance.requestPost(baseurl + 'logon?ReturnUrl=%2f', {
        username:prefs.login,
        password:prefs.password
    }, g_headers);
	
	// Попробуем войти без смс
	if(/Введите код, отправленный на Ваш мобильный телефон/i.test(html)) {
		AnyBalance.trace('Необходимо ввести код из смс.. пропускаем..');
		var token = getParam(html, null, null, /<form action="\/user\/confirmlogon(?:[^>]*>){20,30}[^>]*__RequestVerificationToken[^>]*value="([^"]+)/i);
		if(!token) {
			throw new AnyBalance.Error("Не удалось найти токен отмены смс кода, cайт изменен?");
		}
		
		html = AnyBalance.requestPost(baseurl + 'user/confirmlogon', {
			'otp':'',
			'mode':'nosms',
			'returnUrl':'',
			'__RequestVerificationToken':token
		}, addHeaders({Referer:baseurl+'user/confirmlogon'}));		
	}
	
    if(!/\/logoff/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
		
        throw new AnyBalance.Error("Не удалось зайти в интернет-банк. Сайт изменен?");
    }

    if(waitForRefresh(html, baseurl)) //Обновляем данные о счетах
        html = AnyBalance.requestGet(baseurl + '/');

    if(prefs.type == 'card')
        fetchCard(html, baseurl);
    else if(prefs.type == 'acc')
        fetchAccount(html, baseurl);
    else
        fetchCard(html, baseurl); //По умолчанию карты будем получать
}

function waitForRefresh(html, baseurl){
    var id = getParam(html, null, null, /wait\(\s*'([^']*)/);
    var tried = id, i=0;
    while(id){
        AnyBalance.trace('Waiting for refresh: ' + id + ', try #' + (++i));
        id = AnyBalance.requestPost(baseurl + '/home/wait', {id: id}, g_headers);
        if(id && i > 25){
            AnyBalance.trace('Не удалось дождаться обновления данных за 25 секунд, показываем, что есть...');
            return false;  
        }
            
        sleep(1000);
    }
    return tried;
}

function fetchCard(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d+$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите первые цифры ID карты или не вводите ничего, чтобы показать информацию по первой карте. ID карты можно узнать, получив счетчик \"Сводка\"");

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<tr))*?<a[^>]+href="/finances/card/' + (prefs.cardnum ? prefs.cardnum : '\\d+') + '\\d*"[\\s\\S]*?<\\/tr>)', 'i');
    
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'карту с первыми цифрами ID ' + prefs.cardnum : 'ни одной карты'));

    var result = {success: true};
    getParam(html, result, 'fio', /Добро пожаловать,([\s\S]*?)<\/big>/i, replaceTagsAndSpaces);

    getParam(tr, result, 'id', /\/finances\/card\/(\d+)/i, replaceTagsAndSpaces);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'currency', /<img[^>]*alt="([^"]*)/i, replaceTagsAndSpaces);
    getParam(tr, result, 'type', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);

    if(AnyBalance.isAvailable("all")){
        var items = [];
        html.replace(/<tr[^>]*>(?:[\s\S](?!<tr))*?<a[^>]+href="\/finances\/card\/(\d+)"[\s\S]*?<\/tr>/i, function(str, id){
           var line = "ID:" + id + " \"" + 
               getParam(str, null, null, /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces) + "\" " + 
               getParam(str, null, null, /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
           items[items.length] = line;
        });
        result.all = items.join('\n');
    }

    if(AnyBalance.isAvailable("cardnum", 'status', 'accnum')){
        var id = getParam(tr, null, null, /\/finances\/card\/(\d+)/i, replaceTagsAndSpaces);
        html = AnyBalance.requestGet(baseurl + '/finances/card/' + id, g_headers);

        getParam(html, result, 'cardnum', /Номер карты:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        getParam(html, result, 'status', /Статус:[\s\S]*?<td[^>]*>([\s\S]*?)</i, replaceTagsAndSpaces);
        getParam(html, result, 'accnum', /Номер счета:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    }

    AnyBalance.setResult(result);
}

function fetchAccount(html, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d+$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите первые цифры ID счета или не вводите ничего, чтобы показать информацию по первой карте. ID счета можно узнать, получив счетчик \"Сводка\"");

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<tr))*?<a[^>]+href="/finances/account/' + (prefs.cardnum ? prefs.cardnum : '\\d+') + '\\d*"[\\s\\S]*?<\\/tr>)', 'i');
    
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'счет с первыми цифрами ID ' + prefs.cardnum : 'ни одного счета'));

    var result = {success: true};
    getParam(html, result, 'fio', /Добро пожаловать,([\s\S]*?)<\/big>/i, replaceTagsAndSpaces);

    getParam(tr, result, 'id', /\/finances\/account\/(\d+)/i, replaceTagsAndSpaces);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'currency', /<img[^>]*alt="([^"]*)/i, replaceTagsAndSpaces);
    getParam(tr, result, 'type', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable("all")){
        var items = [];
        html.replace(/<tr[^>]*>(?:[\s\S](?!<tr))*?<a[^>]+href="\/finances\/account\/(\d+)"[\s\S]*?<\/tr>/i, function(str, id){
           var line = "ID:" + id + " \"" + 
               getParam(str, null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces) + "\" " + 
               getParam(str, null, null, /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
           items[items.length] = line;
        });
        result.all = items.join('\n');
    }

    if(AnyBalance.isAvailable('till', 'accnum')){
        var id = getParam(tr, null, null, /\/finances\/account\/(\d+)/i, replaceTagsAndSpaces);
        html = AnyBalance.requestGet(baseurl + '/finances/account/' + id, g_headers);

        getParam(html, result, 'till', /Дата окончания действия карты:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'accnum', /Номер счета:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    }

    AnyBalance.setResult(result);
}