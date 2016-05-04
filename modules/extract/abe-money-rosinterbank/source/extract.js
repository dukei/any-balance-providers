/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':  'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':       'keep-alive',
	'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36'
};

var g_Xml_Headers = {
  'Accept':                   'application/xml, text/xml, */*; q=0.01',
  'X-Requested-With':         'XMLHttpRequest',
  'Wicket-Ajax':              'true',
  'Wicket-Ajax-BaseURL':      'main',
  'Wicket-FocusedElementId':  'id14',
  'Origin':                   'https://b2c.rosinterbank.ru'
};

var baseurl = 'https://b2c.rosinterbank.ru/app/';

function login() {
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

    var html = AnyBalance.requestGet(baseurl, g_headers);

    if(!html || AnyBalance.getLastStatusCode() > 400){
      AnyBalance.trace(html);
      throw new AnyBalance.Error('Ошибка при подключении к сайту интернет-банка! Попробуйте обновить данные позже.');
    }

    if (!/logout/i.test(html)) {
      var actions      = findWicketActions(html),
          wicketAction = [],
          passId       = getParam(html, null, null, /<input[^>]*name="password"[^>]*id="([^"]+)/i),
          loginId      = getParam(html, null, null, /<input[^>]*name="login"[^>]*id="([^"]+)/i),
          formId       = getParam(html, null, null, /<a[^>]*class="button[^>]*id="([^"]+)/i);

      actions.forEach(function (element, index, array) {
        var json = getJson(element);

        var url = (json.u || '').replace(/^.\/main/, 'main').replace(/;jsessionid[^?]+/i, '');
        switch(json.c) {
          case loginId:
            wicketAction[0] = url;
            break;
          case passId:
            wicketAction[1] = url;
            break;
          case formId:
            wicketAction[2] = url;
            break;
        }
      });

      var paramsArr = [
        {login: prefs.login},
        {password: prefs.password},
      ];

      paramsArr[2] = joinObjects(paramsArr[0], paramsArr[1]);

      for(var i = 0; i < wicketAction.length; i++) {
        html = AnyBalance.requestPost(baseurl + wicketAction[i], paramsArr[i], addHeaders(g_Xml_Headers));
      }
    }else{
      AnyBalance.trace('Уже залогинены, используем существующую сессию')
    }

    if (!/logout/i.test(html)) {
      var error = AB.getParam(html, null, null, /"feedbackPanelERROR"[^>]*>([\s\S]*?)<\//i, AB.replaceTagsAndSpaces);
      if (error) {
        throw new AnyBalance.Error(error, null, /Неверно указан/i.test(error));
      }

      AnyBalance.trace(html);
      throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

      __setLoginSuccessful();

    return html;
}

function findWicketActions(html) {
    var actions = sumParam(html, null, null, /Wicket.Ajax.ajax\((\{[\s\S]*?\})\);/ig) || [];
    AnyBalance.trace('Found ' + actions.length + ' Wicket-ajax actions');
    return actions;
}

function requestGetWicketAction(html, regex) {
  var wicketId = getParam(html, null, null, regex);
  if(!wicketId)
    throw new AnyBalance.Error('Не нашли wicketId!');

  var actions = findWicketActions(html);
  var action = findExactWicketAction(actions, wicketId);

  return AnyBalance.requestGet(baseurl + action + '&_=' + new Date().getTime(), addHeaders(g_Xml_Headers));
}

function findExactWicketAction(actions, exactId) {
  if(!actions)
    return;

  for(var i=0; i< actions.length; i++) {
    var json = getJson(actions[i]);
    var url = (json.u || '').replace(/^.\/main/, 'main').replace(/;jsessionid[^?]+/i, '');

    if(json.c === exactId)
      return url;
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;

    var html = AnyBalance.requestGet(baseurl + 'main?main=priv', g_headers);
    html = requestGetWicketAction(html, /wicket.event.add\([^"]*?"load"[\s\S]*?"c":"([^"]*)/i);

    html = requestGetWicketAction(html, /<div[^>]+class="inner"[^>]+id="(id[^"]+)"/i);
    var accounts = getElements(html, /<div[^>]+class=['"]account inner single-account['"][^>]*>/ig);

    AnyBalance.trace('Найдено счетов: ' + accounts.length);
    result.accounts = [];

    for(var i=0; i < accounts.length; ++i) {
      var htmlLocal = requestGetWicketAction(accounts[i] + html, /id="(id[^"]+)"/i);

      var c = {
        __id:   getParam(htmlLocal, null, null, /№(?:[^>]*>)?(\d{20})/i,                         replaceTagsAndSpaces),
        __name: getParam(htmlLocal, null, null, /class="dashed active"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces),
        num:    getParam(htmlLocal, null, null, /№(?:[^>]*>)?(\d{20})/i,                         replaceTagsAndSpaces)

      };

      if(__shouldProcess('accounts', c)){
        processAccount(htmlLocal, c);
      }

      result.accounts.push(c);
    }
}

function processAccount(html, result){
    AnyBalance.trace('Обработка счета ' + result.__name);

  getParam(html, result, 'accounts.balance',                /class="[^"]*amounts"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
  getParam(html, result, ['accounts.currency', 'accounts'], /class="[^"]*amounts"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);

  if(isAvailable('accounts.transactions'))
    processAccountTransactions(html, result);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
    if(!AnyBalance.isAvailable('cards'))
      return;

    var html = AnyBalance.requestGet(baseurl + 'main?main=priv', g_headers);
    html = requestGetWicketAction(html, /wicket.event.add\([^"]*?"load"[\s\S]*?"c":"([^"]*)/i);

    html = requestGetWicketAction(html, /<div[^>]+class="inner"[^>]+id="(id[^"]+)"/i);

    var cards = getElements(html, /<div[^>]+class=['"]card inner['"][^>]*>/ig);

    AnyBalance.trace('Найдено карт: ' + cards.length);
    result.cards = [];

    for(var i=0; i < cards.length; ++i) {
      var _id   = getParam(cards[i], null, null, /<small[^>]+class="gray"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces),
          num   = getParam(cards[i], null, null, /<small[^>]+class="gray"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces),
          title = getParam(cards[i], null, null, /"card-name"[^>]*>([\s\S]*?)<\//i,             replaceTagsAndSpaces);

      var c = {__id: _id, num: num, __name: title + ' ' + _id};

      if(__shouldProcess('cards', c)) {
        processCard(cards[i], c, html);
      }

      result.cards.push(c);
    }
}

function processCard(card, result, html) {
    AnyBalance.trace('Обработка карты ' + result.__name);

    getParam(card, result, 'cards.balance', /class="amount"[^>]*>([\s\S]*?)<\/div>/i,             replaceTagsAndSpaces, parseBalance);
    getParam(card, result, ['cards.currency', 'cards.balance'], /class="amount"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);

    var html = requestGetWicketAction(html, /<div[^>]+class="card inner"[^>]+id="(id[^"]+)"/i);

    getParam(html, result, 'cards.till',       /Срок действия((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'cards.holderName', /Имя владельца((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces);
    getParam(html, result, 'cards.status',     /Статус карты((?:[\s\S]*?<\/div[^>]*>){2})/i,  replaceTagsAndSpaces);

    if(isAvailable('cards.transactions'))
      processCardTransactions(html, result);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
    if(!AnyBalance.isAvailable('deposits'))
      return;

    var html = AnyBalance.requestGet(baseurl + 'main?main=priv', g_headers);
    html = requestGetWicketAction(html, /wicket.event.add\([^"]*?"load"[\s\S]*?"c":"([^"]*)/i);
    html = requestGetWicketAction(html, /<div[^>]+class="inner"[^>]+id="(id[^"]+)"(?:[^>]*>){3,7}\s*Вклады/i);

    var deposits = getElements(html, /<div[^>]+class=['"]account inner[^>]*>/ig);

    AnyBalance.trace('Найдено депозитов: ' + deposits.length);
    result.deposits = [];

    for(var i=0; i < deposits.length; ++i) {
      var htmlLocal = requestGetWicketAction(deposits[i] + html, /id="(id[^"]+)"/i);

      var title = getParam(deposits[i], null, null, /<span[^>]*class=['"]index['"](?:[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces),
          _id   = getParam(htmlLocal,   null, null, /<small[^>]+light(?:[^>]*>){2}([^<]*)/i,                        replaceTagsAndSpaces),
          num   = getParam(htmlLocal,   null, null, /<small[^>]+light(?:[^>]*>){2}([^<]*)/i,                        replaceTagsAndSpaces);

      var c = {__id: _id, __name: title, num: num};

      if(__shouldProcess('deposits', c)) {
        processDeposit(deposits[i], c, htmlLocal);
      }

      result.deposits.push(c);
    }


}

function processDeposit(deposit, result, html) {
    AnyBalance.trace('Обработка депозита ' + result.__name);

    getParam(deposit, result, 'deposits.balance', /<div[^>]+amount[^>]*>([\s\S]*?)<\/div>/i,             replaceTagsAndSpaces, parseBalance);
    getParam(deposit, result, ['deposits.currency', 'cards'], /<div[^>]+amount[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);

    getParam(html, result, 'deposits.pct',              /Процентная ставка(?:[^>]*>){4}([^<]*)/i,                        replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'deposits.pct_charged',      /Сумма выплаченных процентов(?:[^>]*>){4}([^<]*)/i,              replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'deposits.start_balance',    /Сумма вклада на начало действия договора(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'deposits.max_balance',      /Максимальная сумма вклада(?:[^>]*>){4}([^<]*)/i,                replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'deposits.topup',            /Возможность пополнения(?:[^>]*>){4}([^<]*)/i,                   replaceTagsAndSpaces);
    getParam(html, result, 'deposits.topup_sum',        /Сумма пополнения(?:[^>]*>){4}([^<]*)/i,                         replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'deposits.withdraw_sum',     /Возможная сумма снятия(?:[^>]*>){4}([^<]*)/i,                   replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'deposits.topup_till',       /Пополнение вклада возможно до(?:[^>]*>){4}([^<]*)/i,            replaceTagsAndSpaces, parseDate);

    getParam(html, result, 'deposits.acc_pct_transf', /Счет для перечисления процентов(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'deposits.acc_pct_refund', /Счет для возврата по вкладу(?:[^>]*>){4}([^<]*)/i,     replaceTagsAndSpaces);
    getParam(html, result, 'deposits.income_tax',     /Налог на доход(?:[^>]*>){4}([^<]*)/i,                  replaceTagsAndSpaces, parseBalance);


    if(isAvailable('deposits.transactions'))
        processDepositTransactions(html, result);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
    throw new AnyBalance.Error("Обработка кредитов пока не поддерживается. Пожалуйста, обратитесь к разработчикам.");
}
function processInfo(html, result){

  var profile_id   = getParam(html, null, null, /<small[^>]+id="([^"]*)[^>]*>Профиль/i),
      actions      = findWicketActions(html),
      profile_href = findExactWicketAction(actions, profile_id);

  html = AnyBalance.requestGet(baseurl + profile_href, g_headers);
  var info = result.info = {};

  getParam(html, info, 'profile.fio', /ФИО((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces);
  getParam(html, info, 'profile.birthday', /Дата рождения((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces);
  getParam(html, info, 'profile.phone', /Телефон((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces);
  getParam(html, info, 'profile.address', /Адрес регистрации((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces);
  getParam(html, info, 'profile.addressHome', /Домашний адрес((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces);

}
