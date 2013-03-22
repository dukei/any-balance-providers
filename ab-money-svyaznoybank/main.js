/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт Связного Банка через интернет банк.

Сайт оператора: http://www.svyaznoybank.ru/
Личный кабинет: https://ibank.svyaznoybank.ru
*/

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
    var baseurl = "https://ibank.svyaznoybank.ru/lite/app";
    AnyBalance.setDefaultCharset("utf-8");

    var what = prefs.what || 'card';
    if(prefs.num && !/\d{4}/.test(prefs.num))
        throw new AnyBalance.Error("Введите 4 последних цифры номера " + g_phrases.karty[what] + " или не вводите ничего, чтобы показать информацию по " + g_phrases.karte1[what]);

    var html = AnyBalance.requestGet(baseurl + "/pub/Login");
    
    var matches = /<form[^>]*class="login rounded"[^>]*id="([^"]*)"[^>]*action="\.\.([^"]*)"/i.exec(html);
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

    var error = getParam(html, null, null, /<span[^>]*class="feedbackPanelERROR"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);

    var needsms = getParam(html, null, null, /(sms-message-panel)/i);
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
    var $html = $(html);
    
    var pattern = null;
    if(what == 'card')
        pattern = new RegExp('\\d{4} \\*{4} \\*{4} ' + (prefs.num || '\\d{4}'));
    else
        pattern = new RegExp(prefs.num ? '\\d{16}'+prefs.num : '\\d{20}');

    var min_i = -1;
    var min_val = null;
    var cur_i = -1;
    var $acc = $html.find('div.account').filter(function(i){
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
    
    var pattern = new RegExp('\\d{4} \\*{4} \\*{4} ' + ((what == 'card' && prefs.num) || '\\d{4}'));
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
            getParam($card.find('.card-amount-info-balls').text(), result, 'cardballs' + suffix, null, myReplaceTagsAndSpaces, parseBalance);
        }
    }

    getParam($acc.find('.balance-review .amount').text(), result, 'accamount', null, myReplaceTagsAndSpaces, parseBalance);
    getParam($acc.find('.balance-review .amount').text(), result, 'currency', null, myReplaceTagsAndSpaces, parseCurrency);
    getParam($acc.find('.points-by-holds .amount').text(), result, 'holdballs', null, myReplaceTagsAndSpaces, parseBalance);

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
