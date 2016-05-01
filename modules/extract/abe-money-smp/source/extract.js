/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':         'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':     'keep-alive',
	'User-Agent':     'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36'
};

var baseurl = 'https://smponbank.ru/';

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
      html = AnyBalance.requestPost(baseurl + 'Authorize/LogOn', {
        Login:    prefs.login,
        Password: prefs.password
      }, addHeaders({
        Referer: baseurl + 'Authorize/LogOn'
      }));
    }else{
      AnyBalance.trace('Уже залогинены, используем существующую сессию')
    }

    if (!/logout/i.test(html)) {
      var error = getParam(html, null, null, /<div[^>]+summary-errors[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
      if (error)
        throw new AnyBalance.Error(error, null, /Вы указали неверное имя пользователя или пароль/i.test(error));

      AnyBalance.trace(html);
      throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
    }

    html = AnyBalance.requestPost(baseurl + 'Update/RunCustomerUpdate', addHeaders({
      Accept:'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With':'XMLHttpRequest'
    }));

    try{
      AnyBalance.trace('Обновляем данные...');
      var json = getJson(html);
      if(!json.isSuccessful)
        throw new AnyBalance.Error(html);
      AnyBalance.trace('Обновление данных произведено успешно!');
    }catch(e){
      AnyBalance.trace('Обновление данных не удалось: ' + e.message);
    }

      __setLoginSuccessful();

    return html;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка счетов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processAccounts(html, result) {
    if(!AnyBalance.isAvailable('accounts'))
        return;

    html = AnyBalance.requestGet(baseurl + 'Ib/ViewAccounts', g_headers);

    var tables = getElements(html, /<td[^>]+(?:blckListAccountsCurrent|blckListAccountSmpTrader|blckListAccountCard)[^>]*>/ig);
    if(!tables.length) {
      AnyBalance.trace(html);
      AnyBalance.trace("Не удалось найти таблицы со счетами.");
      return;
    }

    var accounts = [];

    for(var i = 0; i < tables.length; i++) {
      var rows = getElements(tables[i], /<tr[^>]*>/ig);
      if(i == 0) {
        rows.splice(2, 1);
      }
      accounts = accounts.concat(rows);
    }

    if(!accounts.length) {
      AnyBalance.trace(html);
      AnyBalance.trace("Не удалось найти счета.");
      return;
    }

    AnyBalance.trace('Найдено счетов: ' + accounts.length);
    result.accounts = [];

    for(var i = 0; i < accounts.length; ++i){
      var id    = getParam(accounts[i], null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<br/i, replaceTagsAndSpaces),
          num   = getParam(accounts[i], null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<br/i, replaceTagsAndSpaces),
          title = getParam(accounts[i], null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<br/i, replaceTagsAndSpaces);

      var c = {__id: id, __name: title, num: num};

      if(__shouldProcess('accounts', c)) {
        processAccount(accounts[i], c);
      }

      result.accounts.push(c);
    }
}

function processAccount(account, result){
    AnyBalance.trace('Обработка счета ' + result.__name);
	
    getParam(account, result, 'accounts.balance', /<td[^>]+td-last nowrap(?:[^>]*>){2}([\s\S]*?)<span/i, replaceTagsAndSpaces, parseBalance);
    getParam(account, result, ['accounts.currency' , 'accounts.balance'], /<td[^>]+td-last nowrap(?:[^>]*>){2}([\s\S]*?)<span/i, replaceTagsAndSpaces, parseCurrency);

    var href = getParam(account, null, null, /<a[^>]+class="details"[^>]+href="\/([^"]*)/i);
    if(!href) {
      AnyBalance.trace(account);
      AnyBalance.trace("Не удалось найти ссылку на подробную информацию о счёте.");
      return;
    }

    var html = AnyBalance.requestGet(baseurl + href, g_headers);
    getParam(html, result, 'accounts.type', /Тип счёта(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'accounts.date_start', /Дата открытия(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'accounts.status', /Статус счёта(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('accounts.transactions')) {
        processAccountTransactions(html, result);
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка карт
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCards(html, result) {
    if(!AnyBalance.isAvailable('cards'))
      return;

    html = AnyBalance.requestGet(baseurl + 'Ib/ViewAccounts', g_headers);

    var table = getElement(html, /<div[^>]+id="blckListCard"[^>]*>/i),
        cards = getElements(table, /<tr[^>]*>/ig);

    if(!cards.length){
          if(/У вас нет карт/i.test(table)){
              AnyBalance.trace('У вас нет карт');
              result.cards = [];
          }else {
              AnyBalance.trace(html);
              AnyBalance.trace('Не удалось найти карты.');
          }
      return;
    }

    AnyBalance.trace('Найдено карт: ' + cards.length);
    result.cards = [];

    for(var i=0; i < cards.length; ++i){
      var id    = getParam(cards[i], null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)(?:<\/td>|<br)/i, replaceTagsAndSpaces),
          num   = getParam(cards[i], null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)(?:<\/td>|<br)/i, replaceTagsAndSpaces),
          title = getParam(cards[i], null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)(?:<\/td>|<br)/i, replaceTagsAndSpaces);

      var c = {__id: id, __name: title, num: num};

      if (__shouldProcess('cards', c)) {
        processCard(cards[i], c);
      }

      result.cards.push(c);
    }
}

function processCard(card, result) {
    AnyBalance.trace('Обработка карты ' + result.__name);

    getParam(card, result, 'cards.balance',                     /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(card, result, ['cards.currency', 'cards.balance'], /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(card, result, 'cards.accnum',                      /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)(?:<br|<\/td>)/i, replaceTagsAndSpaces);
    getParam(card, result, 'cards.till',                        /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);

    var id = getParam(card, null, null, /Ib\/GetCardDetail\?cardId=(\d+)/i);
    if(!id) {
      AnyBalance.trace('Не удалось найти ссылку на дополнительную информацию по карте. Сайт изменен?');
      return;
    }

    var html = AnyBalance.requestGet(baseurl + 'Ib/GetCardDetail?cardId=' + id, g_headers);

    getParam(html, result, 'cards.bonus',       /<i[^>]*>СМП Трансаэро Бонус(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'cards.minpay',      /Сумма минимального платежа(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'cards.minpay_till', /Минимальный платёж необходимо внести до(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'cards.blocked',     /Зарезервированные суммы по расходным операциям(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'cards.till',        /Срок действия(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'cards.type',        /Тип карты(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

	/*if(isAvailable('cards.transactions'))
		processCardTransactions(html, result);*/
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка депозитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processDeposits(html, result) {
	throw new AnyBalance.Error("Обработка депозитов пока не поддерживается. Пожалуйста, обратитесь к разработчикам.");
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Обработка кредитов
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processCredits(html, result) {
	throw new AnyBalance.Error("Обработка кредитов пока не поддерживается. Пожалуйста, обратитесь к разработчикам.");
}

function processInfo(html, result){
    html = AnyBalance.requestGet(baseurl + 'Authorize/Profile', g_headers);

    var info = result.info = {};

    getParam(html, info, 'info.fio', /<span[^>]+user-name[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    getParam(html, info, 'info.mphone', /<input[^>]+primarytxtPhoneView[^>]+value="([^"]*)/i, replaceHtmlEntities);
    getParam(html, info, 'info.email', /<input[^>]+txtemail[^>]+value="([^"]*)/i, replaceHtmlEntities);
}
