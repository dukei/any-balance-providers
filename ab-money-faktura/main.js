/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function parseBalanceEx(_text)
{
    var text = _text.replace(/\s+/g, '');
    var rub = getParam(text, null, null, /(-?\d[\d\s]*[.,-]?\d*[.,]?\d*)/i, [/[^\d]/, ''], parseFloat) || 0;
    var val = rub/100;
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
    return val;
}

var g_phrases = {
   karty: {card: 'карты', acc: 'счета', dep: 'договора на вклад'},
   kartu: {card: 'карту', acc: 'счет', dep: 'договор на вклад'},
   karte1: {card: 'первой карте', acc: 'первому счету', dep: 'первому вкладу'},
   karty1: {card: 'одной карты', acc: 'одного счета', dep: 'одного вклада'}
}

//Заменяем системную строку замен
var myReplaceTagsAndSpaces = [replaceTagsAndSpaces, /(\d)\-(\d)/g, '$1.$2'];

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://www.faktura.ru/lite/app";
    AnyBalance.setDefaultCharset("utf-8");

    var what = prefs.what || 'card';
    if(prefs.num && !/\d{4}/.test(prefs.num))
        throw new AnyBalance.Error("Введите 4 последних цифры номера " + g_phrases.karty[what] + " или не вводите ничего, чтобы показать информацию по " + g_phrases.karte1[what]);

    var html = AnyBalance.requestGet(baseurl + "/pub/Login");
    
    var matches = /class="login rounded[^>]*id="([^"]*)"[^>]*action="\.\.([^"]*)"/i.exec(html);
    if(!matches){
        var prof = getParam(html, null, null, /<title>(Профилактические работы)<\/title>/i);
        if(prof)
            throw new AnyBalance.Error("В настоящее время в системе Интернет-банк проводятся профилактические работы. Пожалуйста, попробуйте ещё раз позже.");
        throw new AnyBalance.Error("Не удаётся найти форму входа в интернет-банк! Сайт недоступен или изменения на сайте.");
    }

    var id=matches[1], href=matches[2];
    var params = {};
    params[id + "_hf_0"] = '';
    params.hasData = 'X';
    params.login=prefs.login;
    params.password=prefs.password;

    html = AnyBalance.requestPost(baseurl + href, params);

    var error = getParam(html, null, null, /<span[^>]*class="feedbackPanelERROR"[^>]*>([\s\S]*?)(<script|<\/span>)/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);

    var needsms = getParam(html, null, null, /(sms-message-panel|Введите SMS-код)/i);
    if(needsms)
        throw new AnyBalance.Error("Для работы этого провайдера требуется отключить в настройках интернет-банка подтверждение входа по СМС. Это безопасно, для совершения операций все равно будет требоваться подтверждение по СМС.");

    AnyBalance.trace("We seem to enter the bank...");

    if(what == 'dep')
        mainDep(what, baseurl);
    else
        mainCardAcc(what, baseurl);
}

function mainCardAcc(what, baseurl){
    var prefs = AnyBalance.getPreferences();
    var html = AnyBalance.requestGet(baseurl + "/priv/accounts");
	
	// Избавимся от jquery
    //var $html = $(html);
    
    /*var pattern = null;
    if(what == 'card')
        pattern = new RegExp('[\\d\\*]{4} \\*{4} \\*{4} ' + (prefs.num || '\\d{4}'));
    else
        pattern = new RegExp(prefs.num ? '\\d{16}'+prefs.num : '\\d{20}');*/

	var tables = sumParam(html, null, null, /(<div class="account-block">(?:[\s\S](?!<div class="account-block">))*?Счет №[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*)/ig, null, null, null, null);
	
	if(!tables.length){
        if(prefs.num)
            throw new AnyBalance.Error('Не удалось найти ' + g_phrases.kartu[what] + ' с последними цифрами ' + prefs.num);
		else
            throw new AnyBalance.Error('Не удалось найти ни ' + g_phrases.karty1[what] + '!');
    }
	// Получили блоки 
	var result = {success: true};
	for(var i = 0; i < tables.length; i++)
	{
		if(what == 'card' && /card-info/i.test(tables[i]))
		{
			// Любая карта
			if(!prefs.num)
			{
				getParam(tables[i], result, 'accnum', /Счет\s*№(\d+)/i, null, null);
				getParam(tables[i], result, 'accname', /bind\(this\)\);">([\s\S]*?)<\/span>/i, null, null);
				getParam(tables[i], result, 'balance', /card-amounts[\s\S]{1,70}class="amount">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalanceEx);
				getParam(tables[i], result, 'cardnum', /<div class="card-info">\s*<span>([\s\S]*?)<\/span>/i, null, null);
				getParam(tables[i], result, '__tariff', /<div class="card-info">\s*<span>([\s\S]*?)<\/span>/i, null, null);
				getParam(tables[i], result, 'accamount', /Средств на счете[\s\S]{1,30}class="amount">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalanceEx);
				getParam(tables[i], result, 'blocked', /Сумма необработанных операций[\s\S]{1,70}class="amount">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalanceEx);
				break;
			}
			else
			{
				var acc = getParam(tables[i], null, null, /<div class="card-info">\s*<span>([\s\S]*?)<\/span>/i, null, null);
				// Смотрим только нужный счет
				if(acc != null && endsWith(acc, prefs.num))
				{
					getParam(tables[i], result, 'accnum', /Счет\s*№(\d+)/i, null, null);
					getParam(tables[i], result, 'accname', /bind\(this\)\);">([\s\S]*?)<\/span>/i, null, null);
					getParam(tables[i], result, 'balance', /card-amounts[\s\S]{1,70}class="amount">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalanceEx);
					getParam(tables[i], result, 'cardnum', /<div class="card-info">\s*<span>([\s\S]*?)<\/span>/i, null, null);
					getParam(tables[i], result, '__tariff', /<div class="card-info">\s*<span>([\s\S]*?)<\/span>/i, null, null);
					getParam(tables[i], result, 'accamount', /Средств на счете[\s\S]{1,30}class="amount">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalanceEx);
					getParam(tables[i], result, 'blocked', /Сумма необработанных операций[\s\S]{1,70}class="amount">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalanceEx);
					break;
				}
			}
		}
		// Любой счет
		else
		{
			// Любая карта
			if(!prefs.num)
			{
				getParam(tables[i], result, 'accnum', /Счет\s*№(\d+)/i, null, null);
				getParam(tables[i], result, 'accname', /bind\(this\)\);">([\s\S]*?)<\/span>/i, null, null);
				getParam(tables[i], result, 'balance', /card-amounts[\s\S]{1,70}class="amount">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalanceEx);
				getParam(tables[i], result, 'cardnum', /<div class="card-info">\s*<span>([\s\S]*?)<\/span>/i, null, null);
				getParam(tables[i], result, '__tariff', /<div class="card-info">\s*<span>([\s\S]*?)<\/span>/i, null, null);
				getParam(tables[i], result, 'accamount', /Средств на счете[\s\S]{1,30}class="amount">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalanceEx);
				getParam(tables[i], result, 'blocked', /Сумма необработанных операций[\s\S]{1,70}class="amount">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalanceEx);
				break;
			}
			else
			{
				var acc = getParam(tables[i], null, null, /id="acc_(\d+)_/i, null, null);
				// Смотрим только нужный счет
				if(acc != null && endsWith(acc, prefs.num))
				{
					getParam(tables[i], result, 'accnum', /Счет\s*№(\d+)/i, null, null);
					getParam(tables[i], result, 'accname', /bind\(this\)\);">([\s\S]*?)<\/span>/i, null, null);
					getParam(tables[i], result, 'balance', /card-amounts[\s\S]{1,70}class="amount">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalanceEx);
					getParam(tables[i], result, 'cardnum', /<div class="card-info">\s*<span>([\s\S]*?)<\/span>/i, null, null);
					getParam(tables[i], result, '__tariff', /<div class="card-info">\s*<span>([\s\S]*?)<\/span>/i, null, null);
					getParam(tables[i], result, 'accamount', /Средств на счете[\s\S]{1,30}class="amount">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalanceEx);
					getParam(tables[i], result, 'blocked', /Сумма необработанных операций[\s\S]{1,70}class="amount">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalanceEx);
					break;
				}
			}
		}
	}
    /*var min_i = -1;
    var min_val = null;
    var cur_i = -1;
    var $acc = $html.find('div.account-block').filter(function(i){
        var matches = pattern.exec($(this).text());
        if(!matches)
             return false;
        ++cur_i;
        if(min_i < 0 || min_val > matches[0]){
            min_i = cur_i;
            min_val = matches[0];
        }
        return true;
    }).eq(min_i);
    
    if(!$acc.size()){
        if(prefs.num)
            throw new AnyBalance.Error('Не удалось найти ' + g_phrases.kartu[what] + ' с последними цифрами ' + prefs.num);
        else
            throw new AnyBalance.Error('Не удалось найти ни ' + g_phrases.karty1[what] + '!');
    }

    var result = {success: true};
	
	
	

    getParam($acc.find('div.account-number').text(), result, 'accnum', /(\d{20})/);
    getParam($acc.find('div.account-name').text(), result, 'accname', null, replaceTagsAndSpaces);
    if(what != 'card')
        getParam($acc.find('div.account-name').text(), result, '__tariff', null, replaceTagsAndSpaces);
    getParam($acc.find('.card-amount-info, .card-amounts-info').text(), result, 'balance', null, myReplaceTagsAndSpaces, parseBalance);
    
    var pattern = new RegExp('[\\d\\*]{4} \\*{4} \\*{4} ' + ((what == 'card' && prefs.num) || '\\d{4}'));
    var cards = [];
    $acc.find('.card-info-row').filter(function(i){
        var text = $(this).text();
        var matches = pattern.exec(text);
        if(!matches)
             return false;
        cards.push([matches[0], this]);
        return true;
    });

    cards.sort(function(a, b){
        if(a[0] < b[0])
            return -1;
        if(a[0] > b[0])
            return 1;
        return 0;
    });

    for(var i=0; i<Math.min(cards.length, 4); ++i){
        var $card = $(cards[i]);
        var suffix = i > 0 ? i : '';
        if($card.size()){
            getParam($card.find('.card-number').text(), result, 'cardnum' + suffix);
            if(what == 'card')
                sumParam($card.find('.card-number').text(), result, '__tariff', null, null, null, aggregate_join);
            getParam($card.find('.card-name').text(), result, 'cardname' + suffix);
        }
    }

    getParam($acc.find('.balance-review .amount').text(), result, 'accamount', null, myReplaceTagsAndSpaces, parseBalance);
    getParam($acc.find('.account-amount-info:contains("Свободных средств") .amount').text(), result, 'free', null, myReplaceTagsAndSpaces, parseBalance);
    getParam($acc.find('.account-amount-info:contains("Сумма необработанных операций") .amount').text(), result, 'blocked', null, myReplaceTagsAndSpaces, parseBalance);
    getParam($acc.find('.balance-review .amount').text(), result, 'currency', null, myReplaceTagsAndSpaces, parseCurrency);
*/
    AnyBalance.setResult(result);
}

function mainDep(what, baseurl){
    var prefs = AnyBalance.getPreferences();
    var html = AnyBalance.requestGet(baseurl + "/priv/deposits");
    var $html = $(html);
    
    var pattern = new RegExp(prefs.num ? '\\d{3,}'+prefs.num+'\\s' : '\\d{7,}\\s');

    var min_i = -1;
    var min_val = null;
    var cur_i = -1;
    var $acc = $html.find('div.deposits tbody tr').filter(function(i){
        var matches = pattern.exec($(this).find('a.deposit-link').text());
        if(!matches)
             return false;
        ++cur_i;
        if(min_i < 0 || min_val > matches[0]){
            min_i = cur_i;
            min_val = matches[0];
        }
        return true;
    }).eq(min_i);
    
    if(!$acc.size()){
        if(prefs.num)
            throw new AnyBalance.Error('Не удалось найти ' + g_phrases.kartu[what] + ' с последними цифрами ' + prefs.num);
        else
            throw new AnyBalance.Error('Не удалось найти ни ' + g_phrases.karty1[what] + '!');
    }

    var result = {success: true};

    getParam($acc.find('span.deposit-name').text(), result, 'accname', null, replaceTagsAndSpaces);
    getParam($acc.find('a.deposit-link span span').first().text(), result, 'cardnum', null, replaceTagsAndSpaces);
    getParam($acc.find('span.deposit-name').text(), result, '__tariff', null, replaceTagsAndSpaces);
    getParam($acc.find('td:nth-child(4)').text(), result, 'balance', null, myReplaceTagsAndSpaces, parseBalance);
    getParam($acc.find('td:nth-child(2)').text(), result, 'currency', null, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('accnum')){
        var href = $acc.find('a.deposit-link').attr('href');
        html = AnyBalance.requestGet(baseurl + '/' + href.replace(/^[.\/]+/g, ''));
        getParam(html, result, 'accnum', /Счет вклада[\s\S]*?<td[^>]*>\s*(\d+)/i);
    }

    AnyBalance.setResult(result);
}
