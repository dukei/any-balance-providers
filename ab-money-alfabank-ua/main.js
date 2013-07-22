/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:22.0) Gecko/20100101 Firefox/22.0'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://my.alfabank.com.ua/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	html = AnyBalance.requestPost(baseurl + 'login', {
        'forbiddenUrl':'',
        'login_':prefs.login,
        password:prefs.password,
        nonce:'',
		ok:''
    }, addHeaders({Referer: baseurl + 'login'}));

    if(!/class="logout"/i.test(html)){
        var error = getParam(html, null, null, /icon exclamation[\s\S]*?"text"[\s\S]*?>\s*([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	// Успешно вошли в кабинет, теперь получаем балансы
	/*if(prefs.type == 'card')
		processCard2(html, baseurl);
    else if(prefs.type == 'acc')
		processAccount(html, baseurl);
    else */if(prefs.type == 'dep')
        processDep(html, baseurl);
    else if(prefs.type == 'credit')
        processCredit(html, baseurl);
    else 
        processCard(html, baseurl);

}

function processCard(html, baseurl){
    html = AnyBalance.requestGet(baseurl + 'get_home_page_block?block=groupCardAccount&_=1374238004632', g_headers);
    
    //var prefs = AnyBalance.getPreferences();
    //if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        //throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");

	// TODO пока не получилось посмотреть как выглядит более одной карты, парсим первую попавщуюся	
    var result = {success: true};
    getParam(html, result, 'balance', /<div class="row regular">[\s\S]*?<div\s*class="data">\s*<nobr>([\s\S]*?)<\/nobr><\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /(\d{4}\s*xxxxxxx\s*\d{4})/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
}

function processDep(html, baseurl){
	throw new AnyBalance.Error('Депозиты не поддерживаются в данной версии, свяжитесь с автором по e-mail.');
}

function processCredit(html, baseurl, _accnum, result){
     html = AnyBalance.requestGet(baseurl + 'get_home_page_block?block=groupCredit&_=1374241044354', g_headers);
    
    /*var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");*/

    var result = {success: true};
    getParam(html, result, 'balance', /Условия договора[\s\S]{1,100}"column column-D-H">\s*([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Счет погашения кредита[\s\S]{1,100}"column column-D-H">\s*([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'period', /Срок предоставления[\s\S]{1,100}"column column-D-H">\s*([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	
	getParam(html, result, 'next_payment', /Следующий платеж[\s\S]*?<div class="column column-D-H">[\s\S]*?необходимо([\s\S]*?)<\/span/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'next_payment_date', /Следующий платеж[\s\S]*?<div class="column column-D-H">[\s\S]*?">\s*([\s\S]*?)<\/span/i, replaceTagsAndSpaces, parseDate);
	
    AnyBalance.setResult(result);
}