/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт Сбербанка, используя систему Сбербанк-онлайн.

Сайт оператора: http://sbrf.ru/
Личный кабинет: https://esk.sbrf.ru/
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp.exec (html);
	if (value) {
		value = value[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
    else
      return value
	}
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', '&nbsp;', ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseCurrency(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /-?\d[\d\s.,]*(\S*)/);
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}

function parseDate(str){
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)(?:[^\d](\d+):(\d+)(?::(\d+))?)?/.exec(str);
    if(matches){
          var date = new Date(+matches[3], matches[2]-1, +matches[1], matches[4], matches[5], matches[6]);
	  var time = date.getTime();
          AnyBalance.trace('Parsing date ' + date + ' from value: ' + str);
          return time;
    }
    AnyBalance.trace('Failed to parse date from value: ' + str);
}

function parseSmallDate(str){
	//Дата
	if(str.indexOf('сегодня')!=-1) {
		var date = new Date();
		return date.getTime();
	} else if(str.indexOf('вчера')!=-1) {
		var date = new Date();
		return date.getTime()-86400000;
	} else {
                var matches = /(\d+)[^\d]+(\d+)/i.exec(str);
                if(!matches){
                    AnyBalance.trace('Не удалось распарсить дату: ' + str);
                }else{
                    var now = new Date();
                    var year = now.getFullYear();
                    if(now.getMonth()+1 < +matches[2])
                        --year; //Если текущий месяц меньше месяца последней операции, скорее всего, то было за прошлый год
                    var date = new Date(year, +matches[2]-1, +matches[1]);
                    return date.getTime();
                }
        }

}

function main() {
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://online.sberbank.ru/CSAFront/login.do";
    AnyBalance.setDefaultCharset('utf-8');

    if(prefs.__debug == 'esk'){
      //Чтобы карты оттестировать
      readEskCards();
      return;
    }

    if(!prefs.login)
        throw new AnyBalance.Error("Пожалуйста, укажите логин для входа в Сбербанк-Онлайн!");
    if(!prefs.password)
        throw new AnyBalance.Error("Пожалуйста, укажите пароль для входа в Сбербанк-Онлайн!");
    if(prefs.lastdigits && !/^\d{4}$/.test(prefs.lastdigits))
        throw new AnyBalance.Error("Надо указывать 4 последних цифры карты или не указывать ничего");
/*      
    var html = AnyBalance.requestGet(baseurl + 'esClient/_logon/LogonContent.aspx');
    var error = getParam(html, null, null, /techBreakMsgLabel[^>]*>([\s\S]*?)<\/span>/i);
    if(error)
        throw new AnyBalance.Error(error);

    var eventvalidation = getEventValidation(html);
    var viewstate = getViewState(html);
    if(!viewstate){
        if(/<title>Runtime Error<\/title>/i.test(html))
            throw new AnyBalance.Error('Сервер Сбербанка Онлайн временно недоступен по техническим причинам. Попробуйте позднее.');
        throw new AnyBalance.Error('Не удаётся найти форму входа. Сайт изменен?');
    }

    html = AnyBalance.requestPost(baseurl + 'esClient/_logon/LogonContent.aspx', {
      __EVENTTARGET:'ctl00$ctl00$BaseContentPlaceHolder$EnterContentPlaceHolder$btnLogin',
      __EVENTARGUMENT:'',
      __VIEWSTATE:viewstate,
      'ctl00$ctl00$tbSbmt':'',
      'ctl00$ctl00$BaseContentPlaceHolder$EnterContentPlaceHolder$tbLogin':prefs.login,
      'ctl00$ctl00$BaseContentPlaceHolder$EnterContentPlaceHolder$tbPassword':'********',
      'ctl00$ctl00$BaseContentPlaceHolder$EnterContentPlaceHolder$hPw':prefs.password,
      'ctl00$ctl00$BaseContentPlaceHolder$EnterContentPlaceHolder$tbAlias':'',
      'ctl00$ctl00$BaseContentPlaceHolder$EnterContentPlaceHolder$tbAliasAgain':'',
      'ctl00$ctl00$BaseContentPlaceHolder$ctl01$ContentUpdatePanelParam':'',
      'ctl00$ctl00$BaseContentPlaceHolder$ctl01$ctl04$userManual2Region$ddlRegions':''
    });
*/
    var html = AnyBalance.requestPost(baseurl);

    var error = getParam(html, null, null, /<h1[^>]*>О временной недоступности услуги[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    html = AnyBalance.requestPost(baseurl, {
	'field(login)':prefs.login,
	'field(password)':prefs.password,
	operation:'button.begin'
    });

    error = getParam(html, null, null, /в связи с ошибкой в работе системы[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    if(/\$\$errorFlag/i.test(html)){
        var error = getParam(html, null, null, /([\s\S]*)/, replaceTagsAndSpaces, html_entity_decode);
        throw new AnyBalance.Error(error);
    }

    var page = getParam(html, null, null, /value\s*=\s*["'](https:[^'"]*?AuthToken=[^'"]*)/i);
    if(!page){
        AnyBalance.trace(html);
        throw new AnyBalance.Error("Не удаётся найти ссылку на информацию по картам. Пожалуйста, обратитесь к автору провайдера для исправления ситуации.");
    }
    
    AnyBalance.trace("About to authorize: " + page);

    if(/esk.zubsb.ru/.test(page)) //Пока только это поддерживается
        doOldAccount(page);
    else if(/online.sberbank.ru\/PhizIC/.test(page))
        doNewAccount(page);
    else if(/Off_Service/i.test(page))
        throw new AnyBalance.Error("В настоящее время услуга Сбербанк ОнЛ@йн временно недоступна по техническим причинам. Сбербанк приносит свои извинения за доставленные неудобства.");
    else
        throw new AnyBalance.Error("К сожалению, ваш вариант Сбербанка-онлайн пока не поддерживается. Пожалуйста, обратитесь к автору провайдера для исправления ситуации.");
}

function doOldAccount(page){
    AnyBalance.trace('Entering old account...');

    var html = AnyBalance.requestGet(page);
    var prefs = AnyBalance.getPreferences();

    var newpage = getParam(html, null, null, /"redirectForm"\s\S*?action="([^"]*)"/i);
    var submitparam = getParam(html, null, null, /<input type="hidden"[^>]*name="([^"]*)"/i);
    if(newpage){
        var params = {};
        params[submitparam] = '';
        html = AnyBalance.requestPost('https://esk.zubsb.ru/pay/sbrf/Preload'+newpage, params);

        if(prefs.type == 'acc')
            fetchOldAcc(html);
        else
            fetchOldCard(html);
        return;
    }

    //Проверим, может это пересылка на режим ограниченной функциональности?
    var redirect = getParam(html, null, null, /Для продолжения работы в этом режиме перейдите по ссылке\s*<a[^>]+href="([^"]*)+/i, null, html_entity_decode);
    if(redirect){
        AnyBalance.trace('Сбербанк перенаправил на ' + redirect);
        if(/esk.sbrf.ru\/esClient\/_logon\/MoveToCards.aspx/i.test(redirect)){
            html = AnyBalance.requestGet(redirect);
            doNewAccountEsk(html);
            return;
        }

        throw new AnyBalance.Error('Сбербанк перенаправил на неизвестный личный кабинет. Пожалуйста, обратитесь к автору провайдера по е-мейл для исправления.');
    }

    throw new AnyBalance.Error('Не удалось войти в старый аккаунт. Проблемы или изменения на сайте. Пожалуйста, свяжитесь с автором провайдера для исправления.');
}

function fetchOldAcc(html){
    var prefs = AnyBalance.getPreferences();

    var countLeft = prefs.lastdigits && (20 - prefs.lastdigits.length);
    var lastdigits = prefs.lastdigits ? (countLeft >= 0 ? '\\d{' + countLeft + '}' + prefs.lastdigits : prefs.lastdigits) : '\\d{20}';
    
    var re = new RegExp('Мои счета и вклады[\\s\\S]*?(<tr[^>]*>(?:[\\s\\S](?!</tr>))*>\\s*' + lastdigits + '\\s*<[\\s\\S]*?</tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr){
        if(prefs.lastdigits)
          throw new AnyBalance.Error("Не удаётся найти ссылку на информацию по счету с последними цифрами " + prefs.lastdigits);
        else
          throw new AnyBalance.Error("Не удаётся найти ни одного счета");
    }

    var result = {success: true};

    getParam(tr, result, 'cardNumber', /(\d{20})/);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)(?:<\/td>|<div)/i, replaceTagsAndSpaces);

    fetchOldThanks(html, result);

    var cardref = getParam(tr, null, null, /<a[^>]+href="([^"]*)/i, null, html_entity_decode);
    
    if(AnyBalance.isAvailable('userName')){
      html = AnyBalance.requestGet('https://esk.zubsb.ru/pay/sbrf/AccountsMain'+cardref);
      getParam(html, result, 'userName', /Владелец(?:&nbsp;|\s+)счета:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    }

    AnyBalance.setResult(result);
}

function fetchOldThanks(html, result){
    var thanksref = getParam(html, null, null, /"([^"]*bonus-spasibo.ru[^"]*)/i);

    if(AnyBalance.isAvailable('spasibo')){
        html = AnyBalance.requestGet(thanksref);
        getParam(html, result, 'spasibo', /Баланс:\s*<strong[^>]*>\s*([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    }
}

function fetchOldCard(html){
    var prefs = AnyBalance.getPreferences();

    var lastdigits = prefs.lastdigits ? prefs.lastdigits : '\\d{4}';
    
    var baseFind = 'Мои банковские карты[\\s\\S]*?<a\\s[^>]*href="[^"]{6,}"[^>]*>[^<]*?';
    var reCard = new RegExp('Мои банковские карты[\\s\\S]*?<a\\s[^>]*href="([^"]{6,})"[^>]*>[^<]*?\\*\\*\\*' + lastdigits, 'i');
    var reCardNumber = new RegExp(baseFind + '(\\d+\\*\\*\\*' + lastdigits + ')', 'i');
    var reOwner = new RegExp(baseFind + '\\*\\*\\*' + lastdigits + '[\\s\\S]*?Владелец счета:([^<]*)', 'i');
    var reEngOwner = new RegExp(baseFind + '\\*\\*\\*' + lastdigits + '[\\s\\S]*?Клиент:([^<]*)', 'i');
    var reBalanceContainer = new RegExp(baseFind + '\\*\\*\\*' + lastdigits + '[\\s\\S]*?<td[^>]*>([\\S\\s]*?)<\\/td>', 'i');
    var cardref = getParam(html, null, null, reCard);
    if(!cardref)
        if(prefs.lastdigits)
          throw new AnyBalance.Error("Не удаётся найти ссылку на информацию по карте с последними цифрами " + prefs.lastdigits);
        else
          throw new AnyBalance.Error("Не удаётся найти ни одной карты");

    var thanksref = getParam(html, null, null, /"([^"]*bonus-spasibo.ru[^"]*)/i);
        
    var result = {success: true};
    getParam(html, result, 'cardNumber', reCardNumber);
    getParam(html, result, 'userName', reOwner, replaceTagsAndSpaces);
    getParam(html, result, 'cardName', reEngOwner, replaceTagsAndSpaces);
    getParam(html, result, 'balance', reBalanceContainer, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'currency', reBalanceContainer, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, '__tariff', reCardNumber, replaceTagsAndSpaces);
    
    if(AnyBalance.isAvailable('till','status','cash','debt','minpay','electrocash','maxcredit','lastPurchDate','lastPurchSum','lastPurchPlace')){
      html = AnyBalance.requestGet('https://esk.zubsb.ru/pay/sbrf/'+cardref);
      getParam(html, result, 'till', /Срок действия:[\s\S]*?<td[^>]*>.*?по ([^<]*)/i, replaceTagsAndSpaces);
      getParam(html, result, 'status', /Статус:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
      getParam(html, result, 'cash', /Доступно наличных[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
      getParam(html, result, 'debt', /Сумма задолженности[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
      getParam(html, result, 'minpay', /Сумма минимального платежа[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
      getParam(html, result, 'electrocash', /Доступно для покупок[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
      getParam(html, result, 'maxcredit', /Лимит кредита[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

      //Последняя операция
      var tr = getParam(html, null, null, /Последние операции по карте:[\s\S]*?<tr[^>]*>((?:[\s\S](?!<\/tr>))*"(?:cDebit|cCredit)"[\s\S]*?)<\/tr>/i);
      if(tr){
          getParam(tr, result, 'lastPurchDate', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
          getParam(tr, result, 'lastPurchSum', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
          getParam(tr, result, 'lastPurchPlace', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
      }else{
          AnyBalance.trace('Последняя операция не найдена.');
      }

    }

    if(AnyBalance.isAvailable('spasibo')){
        html = AnyBalance.requestGet(thanksref);
        getParam(html, result, 'spasibo', /Баланс:\s*<strong[^>]*>\s*([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}

function doNewAccount(page){
    var html = AnyBalance.requestGet(page);
    if(/StartMobileBankRegistrationForm/i.test(html)){
        //Сбербанк хочет, чтобы вы приняли решение о подключении мобильного банка. Откладываем решение.
        html = AnyBalance.requestPost('https://online.sberbank.ru/PhizIC/login/register-mobilebank/start.do', {operation: 'skip'});
//        throw new AnyBalance.Error('Сбербанк хочет, чтобы вы приняли решение о подключении мобильного банка. Пожалуйста, зайдите в Сбербанк ОнЛ@йн через браузер и сделайте выбор.');
    }
    if(/PhizIC/.test(html)){
      return doNewAccountPhysic(html);
    }else{
      return doNewAccountEsk(html);
    }
}

function doNewAccountEsk(html){
    AnyBalance.trace('Entering esk account...');
    
    var baseurl = 'https://esk.sbrf.ru';
    //self.location.href='/esClient/Default.aspx?Page=1&qs=AuthToken=d80365e0-4bfd-41a1-80a1-b24847ae3e94&i=1'
    var page = getParam(html, null, null, /self\.location\.href\s*=\s*'([^'"]*?AuthToken=[^'"]*)/i);
    if(!page){
        AnyBalance.trace(html);
        throw new AnyBalance.Error("Не удаётся найти ссылку на информацию по картам (esk). Пожалуйста, обратитесь к автору провайдера для исправления ситуации.");
    }

    var token = getParam(page, null, null, /AuthToken=([^&]*)/i);
  
    //Переходим в лк esk (Типа логинимся автоматически)
    html = AnyBalance.requestGet(baseurl + page);
    //Зачем-то ещё логинимся 
    html = AnyBalance.requestGet(baseurl + '/esClient/_logon/MoveToCards.aspx?AuthToken='+token+'&i=1&supressNoCacheScript=1');
    
    //AnyBalance.trace(html);
    if(AnyBalance.getPreferences().type == 'acc')
        throw new AnyBalance.Error('Ваш тип личного кабинета не поддерживает просмотр счетов. Если вам кажется это неправильным, напишите автору провайдера е-мейл.');
    
    readEskCards();
}

function readEskCards(){
    var baseurl = 'https://esk.sbrf.ru';
    //Получаем карты
    var prefs = AnyBalance.getPreferences();

    AnyBalance.trace("Reading card list...");
    var html = AnyBalance.requestGet(baseurl + '/esClient/_s/CardsDepositsAccounts.aspx');
    //AnyBalance.trace(html);

    var lastdigits = prefs.lastdigits ? prefs.lastdigits : '\\d{4}';
    
    var baseFind = 'Мои банковские карты[\\s\\S]*?<a\\s[^>]*href="[^"]{6,}"[^>]*>[^<]*?';
    var reCard = new RegExp('Мои банковские карты[\\s\\S]*?<a\\s[^>]*href="([^"]{6,})"[^>]*>[^<]*?\\*\\*\\*' + lastdigits, 'i');
    var reCardNumber = new RegExp(baseFind + '(\\d+\\*\\*\\*' + lastdigits + ')', 'i');
    var reBalanceContainer = new RegExp(baseFind + '\\*\\*\\*' + lastdigits + '[\\s\\S]*?<td[^>]*>([\\S\\s]*?)<\\/td>', 'i');
    var cardref = getParam(html, null, null, reCard);
    if(!cardref)
        if(prefs.lastdigits)
          throw new AnyBalance.Error("Не удаётся найти ссылку на информацию по карте с последними цифрами " + prefs.lastdigits);
        else
          throw new AnyBalance.Error("Не удаётся найти ни одной карты");
        
    var result = {success: true};
    getParam(html, result, 'cardNumber', reCardNumber);
    getParam(html, result, 'balance', reBalanceContainer, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'currency', reBalanceContainer, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, '__tariff', reCardNumber, replaceTagsAndSpaces);
    
    if(AnyBalance.isAvailable('userName', 'cardName', 'till','status','cash','debt','minpay','electrocash','maxcredit')){
      html = AnyBalance.requestGet(baseurl+'/esClient/_s/' + cardref);
      getParam(html, result, 'userName', /Имя держателя:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
      getParam(html, result, 'status', /Статус:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
      getParam(html, result, 'till', /Срок действия:[\s\S]*?<td[^>]*>\s*по\s*([^<\s]*)/i, replaceTagsAndSpaces);
      getParam(html, result, 'cash', /Доступно наличных[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
      getParam(html, result, 'electrocash', /Доступно для покупок[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
      getParam(html, result, 'debt', /Сумма задолженности[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
      getParam(html, result, 'minpay', /Сумма минимального платежа[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
      getParam(html, result, 'maxcredit', /Лимит кредита[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}

function doNewAccountPhysic(html){
    AnyBalance.trace('Entering physic account...');

    if(/confirmTitle/.test(html))
          throw new AnyBalance.Error("Ваш личный кабинет требует одноразовых паролей для входа. Пожалуйста, отмените в настройках кабинета требование одноразовых паролей при входе. Это безопасно: для совершения денежных операций требование одноразового пароля всё равно останется.");

    if(/Откроется справочник регионов, в котором щелкните по названию выбранного региона/.test(html)){
        //Тупой сбер предлагает обязательно выбрать регион оплаты. Вот навязчивость...
        //Ну просто выберем все регионы
        var baseurl = 'https://online.sberbank.ru';
        html = AnyBalance.requestPost(baseurl + '/PhizIC/region.do', {id: -1, operation: 'button.save'});
    }

    var prefs = AnyBalance.getPreferences();
    if(prefs.type == 'acc')
        fetchNewAccountAcc(html);
    else
        fetchNewAccountCard(html);
}

function fetchRates(html, result){
    getParam(html, result, 'eurPurch', new RegExp('<tr class="courseRow1">\\s+<td[^>]+>[\\s\\S]+?</td>\\s+<td[^>]+>\\s+([0-9.]+)\\s+'),null,parseFloat);
    getParam(html, result, 'eurSell', new RegExp('<tr class="courseRow1">(?:\\s+<td[^>]+>[\\s\\S]+?</td>){2}\\s+<td[^>]+>\\s+([0-9.]+)\\s+'),null,parseFloat);
    getParam(html, result, 'usdPurch', new RegExp('<tr class="courseRow2">\\s+<td[^>]+>[\\s\\S]+?</td>\\s+<td[^>]+>\\s+([0-9.]+)\\s+'),null,parseFloat);
    getParam(html, result, 'usdSell', new RegExp('<tr class="courseRow2">(?:\\s+<td[^>]+>[\\s\\S]+?</td>){2}\\s+<td[^>]+>\\s+([0-9.]+)\\s+'),null,parseFloat);
}

function fetchNewThanks(baseurl, result){
    if(AnyBalance.isAvailable('spasibo')){
        html = AnyBalance.requestGet(baseurl + '/PhizIC/private/async/loyalty.do');
        var href = getParam(html, null, null, /^\s*(https?:\/\/\S*)/i);
        if(!href){
            AnyBalance.trace('Не удаётся получить ссылку на спасибо от сбербанка: ' + html);
        }else{
            html = AnyBalance.requestGet(href);
            getParam(html, result, 'spasibo', /Баланс:\s*<strong[^>]*>\s*([^<]*)/i, replaceTagsAndSpaces, parseBalance);
        }
    }
}

function fetchNewAccountCard(html){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://online.sberbank.ru";

    html = AnyBalance.requestGet(baseurl + '/PhizIC/private/cards/list.do');

    var lastdigits = prefs.lastdigits ? prefs.lastdigits.replace(/(\d)/g, '$1\\s*') : '(?:\\d\\s*){3}\\d';
    
    var baseFind = '<span[^>]*class="accountNumber\\b[^"]*">[^<]*' + lastdigits + '<';

    var reCardId = new RegExp(baseFind + '[\\s\\S]*?<span[^>]*class\\s*=\\s*"roundPlate[^>]*onclick\\s*=\\s*"[^"]*info.do\\?id=(\\d+)', 'i');
//    AnyBalance.trace('Пытаемся найти карту: ' + reCardId);
    var cardId = getParam(html, null, null, reCardId);
    
    if(!cardId)
        if(prefs.lastdigits)
          throw new AnyBalance.Error("Не удаётся идентификатор карты с последними цифрами " + prefs.lastdigits);
        else
          throw new AnyBalance.Error("Не удаётся найти ни одной карты");
      
    var reCardNumber = new RegExp('<span[^>]*class="accountNumber\\b[^"]*">\s*([^<]*' + lastdigits + ')<', 'i');
    var reBalance = new RegExp(baseFind + '[\\s\\S]*?<span class="data[^>]*>([^<]*)', 'i');
    
    var result = {success: true};
    getParam(html, result, 'balance', reBalance, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'cardNumber', reCardNumber, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', reCardNumber, replaceTagsAndSpaces);
    getParam(html, result, 'currency', reBalance, replaceTagsAndSpaces, parseCurrency);

    fetchRates(html, result);
    
    if(AnyBalance.isAvailable('userName', 'till', 'cash', 'electrocash')){
        html = AnyBalance.requestGet(baseurl + '/PhizIC/private/cards/detail.do?id=' + cardId);
        getParam(html, result, 'userName', /ФИО Держателя карты:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces);
        getParam(html, result, 'till', /Срок действия до:[\s\S]*?(\d\d\/\d{4})/, replaceTagsAndSpaces);
        getParam(html, result, 'cash', /для снятия наличных:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'electrocash', /для покупок:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
    }

    fetchNewThanks(baseurl, result);

	if(AnyBalance.isAvailable('lastPurchSum') || AnyBalance.isAvailable('lastPurchPlace') || AnyBalance.isAvailable('lastPurchDate')) {
		html=AnyBalance.requestGet(baseurl+'/PhizIC/private/cards/info.do?id='+cardId);
                var tr = getParam(html, null, null, /<tr[^>]*class="ListLine0"[^>]*>([\S\s]*?)<\/tr>/i);

                if(tr){
                    getParam(tr, result, 'lastPurchDate', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseSmallDate);
                    if(AnyBalance.isAvailable('lastPurchSum')){
                        var credit = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
                        var debet = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
                        result.lastPurchSum = credit ? '+' + credit : '-' + debet;
                    }
                    getParam(tr, result, 'lastPurchPlace', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
                }else{
                    AnyBalance.trace('Не удалось найти последнюю операцию.');
                }
	}

    AnyBalance.setResult(result);
}

function fetchNewAccountAcc(html){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://online.sberbank.ru";

    html = AnyBalance.requestGet(baseurl + '/PhizIC/private/accounts/list.do');

    var lastdigits = prefs.lastdigits ? prefs.lastdigits.replace(/(\d)/g, '$1\\s*') : '(?:\\d\\s*){3}\\d';
    
    var baseFind = '<span[^>]*class="productNumber\\b[^"]*">[^<]*' + lastdigits + '<';

    var reCardId = new RegExp(baseFind + '[\\s\\S]*?<span[^>]*class\\s*=\\s*"roundPlate[^>]*onclick\\s*=\\s*"[^"]*(?:operations|info).do\\?id=(\\d+)', 'i');
//    AnyBalance.trace('Пытаемся найти карту: ' + reCardId);
    var cardId = getParam(html, null, null, reCardId);
    
    if(!cardId)
        if(prefs.lastdigits)
          throw new AnyBalance.Error("Не удаётся идентификатор счета с последними цифрами " + prefs.lastdigits);
        else
          throw new AnyBalance.Error("Не удаётся найти ни одного счета");
      
    var reCardNumber = new RegExp('<span[^>]*class="productNumber\\b[^"]*">\s*([^<]*' + lastdigits + ')<', 'i');
    var reBalance = new RegExp(baseFind + '[\\s\\S]*?<span class="data[^>]*>([^<]*)', 'i');
    
    var result = {success: true};
    getParam(html, result, 'balance', reBalance, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'cardNumber', reCardNumber, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', new RegExp("\\?id=" + cardId + "[\\s\\S]*?<span[^>]+class=\"mainProductTitle\"[^>]*>([\\s\\S]*?)<\\/span>", "i"), replaceTagsAndSpaces);
    getParam(html, result, 'currency', reBalance, replaceTagsAndSpaces, parseCurrency);
    
    fetchRates(html, result);
    
    if(AnyBalance.isAvailable('till', 'cash')){
        html = AnyBalance.requestGet(baseurl + '/PhizIC/private/accounts/info.do?id=' + cardId);
        getParam(html, result, 'till', /Дата окончания срока действия:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        getParam(html, result, 'cash', /Максимальная сумма снятия:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }

    fetchNewThanks(baseurl, result);

	if(AnyBalance.isAvailable('lastPurchSum') || AnyBalance.isAvailable('lastPurchPlace') || AnyBalance.isAvailable('lastPurchDate')) {
		html=AnyBalance.requestGet(baseurl+'/PhizIC/private/accounts/operations.do?id='+cardId);
                var tr = getParam(html, null, null, /<tr[^>]*class="ListLine0"[^>]*>([\S\s]*?)<\/tr>/i);

                if(tr){
                    getParam(tr, result, 'lastPurchDate', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseSmallDate);
                    if(AnyBalance.isAvailable('lastPurchSum')){
                        var credit = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
                        var debet = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
                        result.lastPurchSum = credit ? '+' + credit : '-' + debet;
                    }
                    getParam(tr, result, 'lastPurchPlace', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
                }else{
                    AnyBalance.trace('Не удалось найти последнюю операцию.');
                }
	}

    AnyBalance.setResult(result);
}

/**
 * Заменяет HTML сущности в строке на соответствующие им символы
 */
 function html_entity_decode (string) {
  // http://kevin.vanzonneveld.net
  // +   original by: john (http://www.jd-tech.net)
  // +      input by: ger
  // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +    revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   bugfixed by: Onno Marsman
  // +   improved by: marc andreu
  // +    revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +      input by: Ratheous
  // +   bugfixed by: Brett Zamir (http://brett-zamir.me)
  // +      input by: Nick Kolosov (http://sammy.ru)
  // +   bugfixed by: Fox
  // -    depends on: get_html_translation_table
  // *     example 1: html_entity_decode('Kevin &amp; van Zonneveld');
  // *     returns 1: 'Kevin & van Zonneveld'
  // *     example 2: html_entity_decode('&amp;lt;');
  // *     returns 2: '&lt;'
  var hash_map = {},
    symbol = '',
    tmp_str = '',
    entity = '';
  tmp_str = string.toString();
  var quote_style = '';
  if (false === (hash_map = get_html_translation_table('HTML_ENTITIES', quote_style))) {
    return false;
  }

  // fix &amp; problem
  // http://phpjs.org/functions/get_html_translation_table:416#comment_97660
  delete(hash_map['&']);
  hash_map['&'] = '&amp;';

  for (symbol in hash_map) {
    entity = hash_map[symbol];
    tmp_str = tmp_str.split(entity).join(symbol);
  }
  tmp_str = tmp_str.split('&#039;').join("'");

  return tmp_str;
}
function get_html_translation_table (table, quote_style) {
  // http://kevin.vanzonneveld.net
  // +   original by: Philip Peterson
  // +    revised by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +   bugfixed by: noname
  // +   bugfixed by: Alex
  // +   bugfixed by: Marco
  // +   bugfixed by: madipta
  // +   improved by: KELAN
  // +   improved by: Brett Zamir (http://brett-zamir.me)
  // +   bugfixed by: Brett Zamir (http://brett-zamir.me)
  // +      input by: Frank Forte
  // +   bugfixed by: T.Wild
  // +      input by: Ratheous
  // %          note: It has been decided that we're not going to add global
  // %          note: dependencies to php.js, meaning the constants are not
  // %          note: real constants, but strings instead. Integers are also supported if someone
  // %          note: chooses to create the constants themselves.
  // *     example 1: get_html_translation_table('HTML_SPECIALCHARS');
  // *     returns 1: {'"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;'}
  var entities = {},
    hash_map = {},
    decimal;
  var constMappingTable = {},
    constMappingQuoteStyle = {};
  var useTable = {},
    useQuoteStyle = {};

  // Translate arguments
  constMappingTable[0] = 'HTML_SPECIALCHARS';
  constMappingTable[1] = 'HTML_ENTITIES';
  constMappingQuoteStyle[0] = 'ENT_NOQUOTES';
  constMappingQuoteStyle[2] = 'ENT_COMPAT';
  constMappingQuoteStyle[3] = 'ENT_QUOTES';

  useTable = !isNaN(table) ? constMappingTable[table] : table ? table.toUpperCase() : 'HTML_SPECIALCHARS';
  useQuoteStyle = !isNaN(quote_style) ? constMappingQuoteStyle[quote_style] : quote_style ? quote_style.toUpperCase() : 'ENT_COMPAT';

  if (useTable !== 'HTML_SPECIALCHARS' && useTable !== 'HTML_ENTITIES') {
    throw new Error("Table: " + useTable + ' not supported');
    // return false;
  }

  entities['38'] = '&amp;';
  if (useTable === 'HTML_ENTITIES') {
    entities['160'] = '&nbsp;';
    entities['161'] = '&iexcl;';
    entities['162'] = '&cent;';
    entities['163'] = '&pound;';
    entities['164'] = '&curren;';
    entities['165'] = '&yen;';
    entities['166'] = '&brvbar;';
    entities['167'] = '&sect;';
    entities['168'] = '&uml;';
    entities['169'] = '&copy;';
    entities['170'] = '&ordf;';
    entities['171'] = '&laquo;';
    entities['172'] = '&not;';
    entities['173'] = '&shy;';
    entities['174'] = '&reg;';
    entities['175'] = '&macr;';
    entities['176'] = '&deg;';
    entities['177'] = '&plusmn;';
    entities['178'] = '&sup2;';
    entities['179'] = '&sup3;';
    entities['180'] = '&acute;';
    entities['181'] = '&micro;';
    entities['182'] = '&para;';
    entities['183'] = '&middot;';
    entities['184'] = '&cedil;';
    entities['185'] = '&sup1;';
    entities['186'] = '&ordm;';
    entities['187'] = '&raquo;';
    entities['188'] = '&frac14;';
    entities['189'] = '&frac12;';
    entities['190'] = '&frac34;';
    entities['191'] = '&iquest;';
    entities['192'] = '&Agrave;';
    entities['193'] = '&Aacute;';
    entities['194'] = '&Acirc;';
    entities['195'] = '&Atilde;';
    entities['196'] = '&Auml;';
    entities['197'] = '&Aring;';
    entities['198'] = '&AElig;';
    entities['199'] = '&Ccedil;';
    entities['200'] = '&Egrave;';
    entities['201'] = '&Eacute;';
    entities['202'] = '&Ecirc;';
    entities['203'] = '&Euml;';
    entities['204'] = '&Igrave;';
    entities['205'] = '&Iacute;';
    entities['206'] = '&Icirc;';
    entities['207'] = '&Iuml;';
    entities['208'] = '&ETH;';
    entities['209'] = '&Ntilde;';
    entities['210'] = '&Ograve;';
    entities['211'] = '&Oacute;';
    entities['212'] = '&Ocirc;';
    entities['213'] = '&Otilde;';
    entities['214'] = '&Ouml;';
    entities['215'] = '&times;';
    entities['216'] = '&Oslash;';
    entities['217'] = '&Ugrave;';
    entities['218'] = '&Uacute;';
    entities['219'] = '&Ucirc;';
    entities['220'] = '&Uuml;';
    entities['221'] = '&Yacute;';
    entities['222'] = '&THORN;';
    entities['223'] = '&szlig;';
    entities['224'] = '&agrave;';
    entities['225'] = '&aacute;';
    entities['226'] = '&acirc;';
    entities['227'] = '&atilde;';
    entities['228'] = '&auml;';
    entities['229'] = '&aring;';
    entities['230'] = '&aelig;';
    entities['231'] = '&ccedil;';
    entities['232'] = '&egrave;';
    entities['233'] = '&eacute;';
    entities['234'] = '&ecirc;';
    entities['235'] = '&euml;';
    entities['236'] = '&igrave;';
    entities['237'] = '&iacute;';
    entities['238'] = '&icirc;';
    entities['239'] = '&iuml;';
    entities['240'] = '&eth;';
    entities['241'] = '&ntilde;';
    entities['242'] = '&ograve;';
    entities['243'] = '&oacute;';
    entities['244'] = '&ocirc;';
    entities['245'] = '&otilde;';
    entities['246'] = '&ouml;';
    entities['247'] = '&divide;';
    entities['248'] = '&oslash;';
    entities['249'] = '&ugrave;';
    entities['250'] = '&uacute;';
    entities['251'] = '&ucirc;';
    entities['252'] = '&uuml;';
    entities['253'] = '&yacute;';
    entities['254'] = '&thorn;';
    entities['255'] = '&yuml;';
  }

  if (useQuoteStyle !== 'ENT_NOQUOTES') {
    entities['34'] = '&quot;';
  }
  if (useQuoteStyle === 'ENT_QUOTES') {
    entities['39'] = '&#39;';
  }
  entities['60'] = '&lt;';
  entities['62'] = '&gt;';


  // ascii decimals to real symbols
  for (decimal in entities) {
    if (entities.hasOwnProperty(decimal)) {
      hash_map[String.fromCharCode(decimal)] = entities[decimal];
    }
  }

  return hash_map;
}
/*function html_entity_decode(str)
{
	//return str;
    //jd-tech.net
    var tarea = document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}*/