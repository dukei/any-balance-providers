/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_countersTable = {
  common: {
    'fio': 'info.fio'
  },
  card: {
    "balance": "cards.balance",
    "bonus": "cards.bonus",
    "currency": "cards.currency",
    "cardnum": "cards.num",
    "__tariff": "cards.num",
    "till": "cards.till",
    "accnum": "cards.accnum",
    "cardname": "cards.type",
    'payNext': 'cards.minpay',
    'payTill': 'cards.minpay_till',
  },
  acc: {
    "balance": "accounts.balance",
    "currency": "accounts.currency",
    "status": "accounts.status",
    "type": "accounts.type",
    "__tariff": "accounts.num",
    "accnum": "accounts.num",
    "date_start": "accounts.date_start",
  }
};

function shouldProcess(counter, info){
  var prefs = AnyBalance.getPreferences();

  if(!info || (!info.__id || !info.__name))
    return false;

  switch(counter){
    case 'cards':
    {
      if(prefs.type != 'card')
        return false;
      if(!prefs.num)
        return true;

      if(endsWith(info.num, prefs.num))
        return true;

      return false;
    }
    case 'accounts':
    {
      if(prefs.type != 'acc')
        return false;
      if(!prefs.num)
        return true;

      if(endsWith(info.num, prefs.num))
        return true;
    }
    case 'credits':
    {
      if(prefs.type != 'crd')
        return false;
      if(!prefs.num)
        return true;

      if(endsWith(info.num, prefs.num))
        return true;
    }
    case 'deposits':
    {
      if(prefs.type != 'dep')
        return false;
      if(!prefs.num)
        return true;

      if(endsWith(info.num, prefs.num))
        return true;
    }
    default:
      return false;
  }
}

function main() {
  var prefs = AnyBalance.getPreferences();

  if(!/^(card|crd|dep|acc)$/i.test(prefs.type || ''))
    prefs.type = 'card';

  var adapter = new NAdapter(joinObjects(g_countersTable[prefs.type], g_countersTable.common), shouldProcess);

  adapter.processCards    = adapter.envelope(processCards);
  adapter.processAccounts = adapter.envelope(processAccounts);
  adapter.processCredits  = adapter.envelope(processCredits);
  adapter.processDeposits = adapter.envelope(processDeposits);
  adapter.processInfo     = adapter.envelope(processInfo);

  var html = login(prefs);

  var result = {success: true};

  processInfo(html, result);

  if(prefs.type == 'card') {
    adapter.processCards(html, result);

    if(!adapter.wasProcessed('cards'))
      throw new AnyBalance.Error(prefs.num ? 'Не найдена карта с последними цифрами ' + prefs.num : 'У вас нет ни одной карты!');

    result = adapter.convert(result);
  } else if(prefs.type == 'acc') {
    adapter.processAccounts(html, result);

    if(!adapter.wasProcessed('accounts'))
      throw new AnyBalance.Error(prefs.num ? 'Не найден счет с последними цифрами ' + prefs.num : 'У вас нет ни одного счета!');

    result = adapter.convert(result);
  } else if(prefs.type == 'crd') {
    adapter.processCredits(html, result);

    if(!adapter.wasProcessed('credits'))
      throw new AnyBalance.Error(prefs.num ? 'Не найден кредит с последними цифрами ' + prefs.num : 'У вас нет ни одного кредита!');

    result = adapter.convert(result);
  } else if(prefs.type == 'dep') {
    adapter.processDeposits(html, result);

    if(!adapter.wasProcessed('deposits'))
      throw new AnyBalance.Error(prefs.num ? 'Не найден депозит с последними цифрами ' + prefs.num : 'У вас нет ни одного депозита!');

    result = adapter.convert(result);
  }

  html = AnyBalance.requestGet('https://smponbank.ru/', g_headers);

  var table = getParam(html, null, null, />Курсы и обмен валюты([\s\S]*?)<\/table>/i);
  if(AnyBalance.isAvailable('usd','eur','gbp') && table) {
    getParam(table, result, 'usd', /USD(?:[^>]*>){5,10}\s*<\/tr>/i, [replaceTagsAndSpaces, /(\d)\s/, '$1/']);
    getParam(table, result, 'eur', /EUR(?:[^>]*>){5,10}\s*<\/tr>/i, [replaceTagsAndSpaces, /(\d)\s/, '$1/']);
    getParam(table, result, 'gbp', /GBP(?:[^>]*>){5,10}\s*<\/tr>/i, [replaceTagsAndSpaces, /(\d)\s/, '$1/']);
  }

  AnyBalance.setResult(result);
}

/* Оставим на случай, если что-то пойдёт не так
function fetchCard(baseurl, html, result){
    var prefs = AnyBalance.getPreferences();

    if(prefs.contract && !/^\d{4}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите 4 последние цифр номера карты, по которой вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первой карте.');

    var table = getParam(html, null, null, /<div[^>]+id="blckListCard"[^>]*>\s*<table[^>]*>([\s\S]*?)<\/table>/i);
    if(!table)
        throw new AnyBalance.Error('Не удалось найти список карт. Сайт изменен?');

    var re = new RegExp('<tr(?:[\\s\\S](?!</tr))*?\\*{4}' + (prefs.contract || '\\d{4}') + '[\\s\\S]*?</tr>', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'карту с последними цифрами ' + prefs.contract : 'ни одной карты'));

    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, ['currency', 'balance'], /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)(?:<br|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)(?:<\/td>|<br)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'fio', /<li[^>]+class="userIndication"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('cardname')){
        var cn = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i);
        getParam(cn || '', result, 'cardname', /<span[^>]+class="[^"]*editLinkWrapper[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(result.cardname == 'Добавить название')
            getParam(tr, result, 'cardname', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)(?:<\/td>|<br)/i, replaceTagsAndSpaces, html_entity_decode);
    }

    if(AnyBalance.isAvailable('till','bonus','payNext','payTill','blocked','type')){
        var id = getParam(tr, null, null, /Ib\/GetCardDetail\?cardId=(\d+)/i);
        if(!id){
            AnyBalance.trace('Не удалось найти ссылку на дополнительную информацию по карте. Сайт изменен?');
        }else{
            html = AnyBalance.requestGet(baseurl + 'Ib/GetCardDetail?cardId=' + id, g_headers);
            getParam(html, result, 'bonus', /<i[^>]*>СМП Трансаэро Бонус(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'payNext', /Сумма минимального платежа(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'payTill', /Минимальный платёж необходимо внести до(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
            getParam(html, result, 'blocked', /Зарезервированные суммы по расходным операциям(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'till', /Срок действия(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
            getParam(html, result, 'type', /Тип карты(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        }
    }
}*/
