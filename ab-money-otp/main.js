/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

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

function waitForTransaction(url){
    do{
       html = $.trim(AnyBalance.requestGet(baseurl + url, g_headers));
       if(html == 'FINISHED' || html == 'TIMEOUT')
           break;
       if(html != 'WAITING')
           throw new AnyBalance.Error('Неизвестный ответ от проверки транзакции: ' + html);
       AnyBalance.trace('Waiting for transaction to finish...');
       sleep(3000);
    }while(true);
}

var baseurl = "https://direkt.otpbank.ru/homebank/do/";
var g_headers = {
  'Accept':'*/*',
   'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
   'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
   'Connection':'keep-alive',
   'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.89 Safari/537.1'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset("utf-8");
    
    var html = AnyBalance.requestPost(baseurl + "bejelentkezesJelszoalapu", {
        azonosito:prefs.login,
        jelszo:prefs.password,
        tranzakcionkentiAzonositas:'off',
        muvelet:'login',
        cacheHasznalat:'off',
        x:86,
        y:11,
        lang:'ru'
    }, g_headers);

    if(!/\/homebank\/do\/beallitasok\/kijelentkezes/i.test(html)){
        var error = getParam(html, null, null, [/<p[^>]+class="[^"]*red[^>]*>([\s\S]*?)<\/p>/i, /\$\('#alert_title'\)\.html\('([^']*)/], replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /неверно ввели логин или пароль/i.test(error));
		
		if(/Ваш доступ в ОТПдирект заблокирован/i.test(html))
			throw new AnyBalance.Error("Ваш доступ в ОТПдирект заблокирован, Пожалуйста, обратитесь в Контакт-Центр или в ближайшее для Вас Отделение Банка для разблокировки доступа.", null, true);
		
        AnyBalance.trace(html);
        throw new AnyBalance.Error("Не удалось зайти в интернет-банк. Сайт изменен?");
    }

    var form = getParam(html, null, null, /(<form[^>]+name="bankszamlaMuveletForm"[\s\S]*?<\/form>)/i);
    if(!form)
        throw new AnyBalance.Error("Не удалось найти форму запроса информации по картам. Обратитесь к автору провайдера.");

    var hrefCheck = getParam(html, null, null, /actionURL\s*:\s*['"]\/homebank\/do\/([^'"]*)/);
    waitForTransaction(hrefCheck);

    var params = createFormParams(form);
    html = AnyBalance.requestPost(baseurl + "bankszamla/bankszamlaMuvelet", params, g_headers);

    var cards = getParam(html, null, null, /<form[^>]+name="bankszamlaMuveletForm"[^>]*>([\s\S]*?)<\/form>/i);
    if(!cards)
        throw new AnyBalance.Error('Не удалось найти таблицу карт и счетов!');

    if(prefs.type == 'card')
        fetchCard(cards);
    else if(prefs.type == 'acc')
        fetchAccount(cards);
    else
        fetchCard(cards);
}

function fetchCard(cards){
    var prefs = AnyBalance.getPreferences();

    if(prefs.num && !/\d{4}/.test(prefs.num))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");

    var $cards = $('<div>' + cards + '</div>');
    var re = prefs.num ? new RegExp('(\\d{4}\\s*\\*{4}\\s*\\*{4}\\s*' + prefs.num + ')') : /(\d{4}\s*\*{4}\s*\*{4}\s*\d{4})/;

    var $card = $cards.find('table.nagyTabla>tbody>tr').filter(function(index){
        return re.test($(this).text());
    }).first();

    if(!$card.size())
        throw new AnyBalance.Error('Не удалось найти ' + (prefs.num ? 'карту с последними цифрами ' + prefs.num : 'ни одной карты'));

    var result = {success: true};
    
    getParam($card.text(), result, 'cardnum', re, replaceTagsAndSpaces, html_entity_decode);
    getParam($card.find('td:nth-child(3)').first().text(), result, 'cardname', null, replaceTagsAndSpaces, html_entity_decode);
    getParam($card.find('td:nth-child(3)').first().text(), result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode);
    getParam($card.find('td:nth-child(2)').first().text(), result, 'type', null, replaceTagsAndSpaces, html_entity_decode);
    getParam($card.find('td:nth-child(5)').first().text(), result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    getParam($card.find('td:nth-child(5)').first().text(), result, ['currency', 'balance', 'minpay', 'limit', 'gracepay', 'debt', 'own'], null, replaceTagsAndSpaces, parseCurrency);
    
    if(AnyBalance.isAvailable('till','own','debt','minpay','minpaytill','gracepay','gracetill','limit')){
        var href = $card.find('td:nth-child(3) a').first().attr('href');
        href = getParam(href, null, null, /\/homebank\/do\/(.*)/i);
        if(!href)
            throw new AnyBalance.Error('Не удалось найти ссылку на детальную информацию по карте. Обратитесь к автору провайдера');
        var html = AnyBalance.requestGet(baseurl + href, g_headers);
    
        var form = getParam(html, null, null, /(<form[^>]+name="torzsadatLekerdezesForm"[\s\S]*?<\/form>)/i);
        if(!form)
            throw new AnyBalance.Error("Не удалось найти форму запроса детальной информации по карте. Обратитесь к автору провайдера.");
        
        var hrefCheck = getParam(html, null, null, /actionURL\s*:\s*['"]\/homebank\/do\/([^'"]*)/);
        waitForTransaction(hrefCheck);
        
        var params = createFormParams(form);
        html = AnyBalance.requestPost(baseurl + "bankkartya/torzsadatLekerdezesLink", params, g_headers);

        getParam(html, result, 'till', /Дата окончания действия карты[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'own', /Остаток собственных средств[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'debt', /Сумма общей задолженности к уплате[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'minpay', /Минимальный платеж[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'minpaytill', /Дата очередного платежа[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'gracepay', /Платеж льготного периода[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'gracetill', /(?:Дата вхождения в льготный период|Дата окончания льготного периода)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'limit', /Кредитный лимит[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    }

    AnyBalance.setResult(result);
}

function fetchAccount(accounts){
    var prefs = AnyBalance.getPreferences();

    if(prefs.num && !/\d{4,20}/.test(prefs.num))
        throw new AnyBalance.Error("Введите от 4 последних цифр номера счета или не вводите ничего, чтобы показать информацию по первому счету");

    //Сколько цифр осталось, чтобы дополнить до 20
    var accnum = prefs.cardnum || '';
    var accprefix = accnum.length;
    accprefix = 20 - accprefix;

    var $cards = $('<div>' + accounts + '</div>');
    var re = new RegExp('(' + (accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum + ')', 'i');

    var $card = $cards.find('table.nagyTabla>tbody>tr').filter(function(index){
        return re.test($(this).text());
    }).first();

    if(!$card.size())
        throw new AnyBalance.Error('Не удалось найти ' + (prefs.num ? 'счет с последними цифрами ' + prefs.num : 'ни одного счета'));

    var result = {success: true};
    
    getParam($card.text(), result, 'cardnum', re, replaceTagsAndSpaces, html_entity_decode);
    getParam($card.find('td:nth-child(2)').first().text(), result, 'cardname', null, replaceTagsAndSpaces, html_entity_decode);
    getParam($card.find('td:nth-child(2)').first().text(), result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode);
    getParam($card.find('td:nth-child(4)').first().text(), result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    getParam($card.find('td:nth-child(4)').first().text(), result, ['currency', 'balance'], null, replaceTagsAndSpaces, parseCurrency);
    
    AnyBalance.setResult(result);
}
