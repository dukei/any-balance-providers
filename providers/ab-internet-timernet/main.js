/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://cabinet.timernet.ru/client3/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	newTypicalLanBillingInetTv(baseurl + 'index.php');
}

function newTypicalLanBillingInetTv(baseurl) {
  var urlAjax = baseurl + '?r=account/vgroups&agrmid=';
  var urlIndex = baseurl + '?r=site/login';

  var prefs = AnyBalance.getPreferences();
  AnyBalance.setDefaultCharset('utf-8');

  if (prefs.__dbg) {
    var html = AnyBalance.requestGet(baseurl + '?r=account/index');
  } else {
    var html = AnyBalance.requestGet(urlIndex);

    var csrfToken = getParam(html, null, null, /<input[^>]+value="([^"]*)[^>]+id="YII_CSRF_TOKEN"/i, replaceHtmlEntities);
    if(csrfToken){
    	var domain = getParam(baseurl, null, null, /https?:\/\/([^\/]*)/i);
    	AnyBalance.setCookie(domain, 'YII_CSRF_TOKEN', csrfToken);
    }

    html = AnyBalance.requestPost(urlIndex, {
      'LoginForm[login]': prefs.login,
      'LoginForm[password]': prefs.password,
      'YII_CSRF_TOKEN': csrfToken,
      'yt0': 'Войти'
    });
  }

  if (!/r=site\/logout/i.test(html)) {
    var error = getParam(html, null, null, [/alert-error[^>]*"(?:[^>]*>){2}([\s\S]*?)<\/div>/i,
      /Необходимо исправить следующие ошибки:([\s\S]*?)<\/ul>/i
    ], replaceTagsAndSpaces);
    if (error)
      throw new AnyBalance.Error(error, null, /Неверное имя пользователя или пароль/i.test(error));

    AnyBalance.trace(html);
    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
  }

  var result = {
    success: true
  };
  var priority = {
    active: 0,
    inactive: 1
  };

  //Вначале попытаемся найти интернет лиц. счет
  var accTv = [],
    accInet = [];

  var table = getParam(html, null, null, /Номер договора[\s\S]*?<\/table>/i);
  var accs = sumParam(html, null, null, /<tr[^>]*agreements[^>]*row(?:[^>]*>){10,20}\s*<\/tr>/ig);
  AnyBalance.trace('Найдено счетов: ' + accs.length);

  for (var i = 0; i < accs.length; ++i) {
    var account = getParam(accs[i], null, null, [/<strong>\s*(\d+)/i, /<td[^>]+class="first_col"[^>]*>([\s\S]*?)<\/td>/i]);
    var accountID = getParam(accs[i], null, null, /<tr[^>]*agreements[^>]*row[^>]*?(\d+)/i);
    var balance = getParam(accs[i], null, null, /(-?[\s\d.,]+руб)/i, null, parseBalance);

    if (!isset(account) || !isset(accountID)) {
      AnyBalance.trace('Не удалось найти данные, проблемы на сайте?');
      continue;
    }

    var xhtml = AnyBalance.requestGet(urlAjax + accountID);
    var json = getJson(xhtml);

    // Может быть несколько услуг по одному счету
    AnyBalance.trace('Услуг по счету ' + account + ': ' + json.body.length);

    for (var j = 0; j < json.body.length; j++) {
      var tarifdescr = json.body[j].tarifdescr; //Цифровое ТВ

      if (typeof tarifdescr == 'object') {
        tarifdescr = tarifdescr.descr;
      }

      var state = json.body[j].state.state + ''; //Состояние: активен, Недостаточно средств, Выключен, Действует
      var services = json.body[j].services[0] + ''; //Нет подключенных услуг

      var response = {
        bal: balance,
        abon: json.body[j].rent,
        acc: account,
        accId: accountID,
        'tarifdescr': tarifdescr,
        'state': state,
        'services': services
      };
      var act = /Состояние:\s+актив|Действует/i.test(state) ? 'active' : 'inactive';
      var pri = priority[act];
      // Это ТВ
      if (/\BТВ\B|Телевидение/.test(tarifdescr) && !/ШПД/.test(tarifdescr)) {
        if (!isset(accTv[pri]))
        	accTv[pri] = [];
          accTv[pri].push(response);
        // Это интернет
      } else {
        if (!isset(accInet[pri]))
          accInet[pri] = [];
        accInet[pri].push(response);
      }
    }
  }

  var usedAccs = {}; //аккаунты только уникальные собираем

  function readAcc(json, isInet) {
    if (json) {
      getParam(json.bal, result, isInet ? 'balance' : 'balance_tv');
      if (!usedAccs['acc_' + json.acc]) { //аккаунты только уникальные собираем
        sumParam(json.acc, result, 'agreement', null, replaceTagsAndSpaces, null, aggregate_join);
        usedAccs['acc_' + json.acc] = true;
      }

      if (!/Выключен/i.test(json.state) /*&& !/не\s*доступно/i.test(json.services)*/) {
        sumParam(json.abon, result, 'abon', null, null, parseBalance, aggregate_sum);
        sumParam(json.tarifdescr, result, '__tariff', null, null, null, aggregate_join);
      }
    }
  }

  function readAccByPriority(arr, isInet) {
    for (var i = 0; i < arr.length; ++i){
      	for(var j=0; arr[i] && j<arr[i].length; ++j)
        	readAcc(arr[i][j], isInet);
        break;
    }
  }

  readAccByPriority(accInet, true);
  readAccByPriority(accTv);

  getParam(html, result, 'username', [/<div[^>]+class="content-aside"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i,
  	/<div[^>]+client-info-item-value[^>]*>([\s\S]*?)<\/div>/i], replaceTagsAndSpaces);

  AnyBalance.setResult(result);
}
