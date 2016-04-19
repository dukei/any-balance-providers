/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

24.02.2016  добавлена функция getSimple() для города Норильск
*/

var g_headers = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
  'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
  'Cache-Control': 'max-age=0',
  Connection: 'keep-alive',
  'X-Requested-With': 'XMLHttpRequest',
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
};

var regions = {
  moscow: getMoscow,
  rostov: getRostov,
  nsk: getNsk,
  prm: getPrm,
  ekt: getPrm,
  krv: getKrv,
  vnov: getVnov,
  nnov: getNnov,
  nnov_tv: getNnovTv,
  sdv: getSdv,
  vlgd: getVologda,
  izh: getIzhevsk,
  pnz: getPnz,
  kms: getKomsomolsk,
  tula: getTula,
  bal: getBalakovo,
  uln: getUln,
  nor: getNorilsk,
  mag: getMagnit,
  miass: getMiass,
  kurgan: getKurgan,
  barnaul: getBarnaul,
  belgorod: getBelgorod,
  saratov: getSaratov,
  saratov_tv: getSaratovTv,
  smolensk: getSmolensk,
  chita: getChita,
  amur: getAmur,
  orel: getOrel,
  piter: getPiter,
  yar: getYar,
  arkh: getArkh,
  vladimir: getVladimir,
  volzhsk: getVolzhsk,
  novokuz: getNovokuz,
  nahodka: getNahodka,
  kursk: getKursk,
  ryazan: getRyazan,
};

function main() {
  var prefs = AnyBalance.getPreferences();
  var region = prefs.region;
  if (!region || !regions[region])
    region = 'volzhsk';

  var func = regions[region];
  AnyBalance.trace('Регион: ' + region);

  checkEmpty(prefs.login, 'Введите логин!');
  checkEmpty(prefs.password, 'Введите пароль!');

  func();
}

function getRostov() {
  var prefs = AnyBalance.getPreferences();
  var baseurl = 'https://lk.ug.mts.ru/';

  // Заходим на главную страницу
  var html = AnyBalance.requestPost(baseurl + "auth/login", {
    login: prefs.login,
    password: prefs.password
  });

  if (!/auth\/logout/i.test(html)) {
    var error = getParam(html, null, null, /"b_error"(?:[^>]*>){8}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    if (error)
      throw new AnyBalance.Error(error, null,
        /Неправильный лицевой счет или пароль|Допустимыми символами для лицевого счета являются цифры/i.test(error));

    AnyBalance.trace(html);
    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
  }

  var result = {
    success: true
  };

  getParam(html, result, 'username', /"customer-info"([^>]*>){6}/i, replaceTagsAndSpaces);
  getParam(html, result, 'agreement', /Договор №([^<]+)/i, replaceTagsAndSpaces);
  getParam(html, result, 'license', /Номер лицевого счета:([^>]*>){2}/i, replaceTagsAndSpaces);
  getParam(html, result, 'balance', /Баланс:\s*<[^>]*>(-?\d[\d\.,\s]*)/i, replaceTagsAndSpaces, parseBalance);

  html = AnyBalance.requestGet(baseurl + 'account/resources');
  getParam(html, result, '__tariff', /"with-border">(?:[\s\S]*?<td[^>]*>){3}(.*?)<\/td>/i, replaceTagsAndSpaces);
  /*if(AnyBalance.isAvailable('abon')){
        html = AnyBalance.requestGet(baseurl + 'account/stat');
        getParam(html, result, 'abon', /Абон[а-я\.]* плата(?:[\s\S]*?<td[^>]*>){2}\s*(-?\d[\d\s\.,]*)/i, replaceTagsAndSpaces, parseBalance);
    }*/
  AnyBalance.setResult(result);
}

function getMoscow() {
  var prefs = AnyBalance.getPreferences();
  var baseurl = 'https://kabinet.mts.ru/zservice/';
  var baseloginurl =
    "https://login.mts.ru/amserver/UI/Login?service=stream&arg=newsession&goto=http%3A%2F%2Fkabinet.mts.ru%3A80%2Fzservice%2F";

  AnyBalance.setOptions({
    PER_DOMAIN: {
      'dialup.mtu.ru': {
        DEFAULT_CHARSET: 'koi8-r'
      }
    }
  });

  var info = enterMTS({
    baseurl: baseurl,
    url: baseloginurl,
    login: prefs.login,
    password: prefs.password
  });

  $parse = $(info.replace(/^[^<]+/, ''));

  if (!/src=exit/i.test(info)) {
    var error = $.trim($parse.find('div.logon-result-block>p').text());
    if (!error)
      error = getParam(info, null, null, /<label[^>]+validate="IDToken1"[^>]*>([\s\S]*?)<\/label>/i, replaceTagsAndSpaces);
    if (!error)
      error = getParam(info, null, null, /<label[^>]+validate="IDToken2"[^>]*>([\s\S]*?)<\/label>/i, replaceTagsAndSpaces);

    if (error)
      throw new AnyBalance.Error(error);

    throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Неверный логин-пароль, регион или сайт изменен.");
  }

  //    info = AnyBalance.requestGet(baseurl);


  //    AnyBalance.trace(info);

  // Находим ссылку "Счетчики услуг"
  var $url = $parse.find("A:contains('Счетчики услуг')").first();
  if ($url.length != 1)
    throw new AnyBalance.Error("Невозможно найти ссылку на счетчики услуг");

  var html = AnyBalance.requestGet(baseurl + $url.attr('href'));
  var result = {
    success: true
  };

  var matches;

  //Тарифный план
  if (matches = /Тарифный план:[\s\S]*?>(.*?)</.exec(html)) {
    result.__tariff = matches[1];
  }

  getParam(html, result, 'daysleft', /(\d+) дн\S+ до списания абонентской платы/i, null, parseBalance3);

  // Баланс
  if (AnyBalance.isAvailable('balance')) {
    if (matches = /customer-info-balance"><strong>\s*(.*?)\s/.exec(html)) {
      var tmpBalance = matches[1].replace(/ |\xA0/, ""); // Удаляем пробелы
      tmpBalance = tmpBalance.replace(",", "."); // Заменяем запятую на точку
      result.balance = parseFloat(tmpBalance);
    }
  }

  // Лицевой счет
  if (AnyBalance.isAvailable('license')) {
    if (matches = /Лицевой счет:[\s\S]*?>(.*?)</.exec(html)) {
      result.license = matches[1];
    }
  }

  // Номер договора
  if (AnyBalance.isAvailable('agreement')) {
    if (matches = /Договор:[\s\S]*?>(.*?)</.exec(html)) {
      result.agreement = matches[1];
    }
  }

  // ФИО
  if (AnyBalance.isAvailable('username')) {
    if (matches = /<h3>([^<]*)<\/h3>/i.exec(html)) {
      result.username = matches[1];
    }
  }

  if (AnyBalance.isAvailable('internet_cur')) {
    // Находим ссылку "Счетчики услуг"
    matches = html.match(/<div class="gridium sg">\s*(<table>[\s\S]*?<\/table>)/i);
    if (matches) {
      var counter = $(matches[1]).find("tr.gm-row-item:contains('трафик')").find('td:nth-child(3)').first().text();
      if (counter)
        counter = $.trim(counter);
      if (counter)
        result.internet_cur = parseFloat(counter);
    }
  }

  if (AnyBalance.isAvailable('abon')) {
    // Находим ссылку "Расход средств"
    var $url = $parse.find("A:contains('Расход средств')").first();
    if ($url.length != 1)
      throw new AnyBalance.Error("Невозможно найти ссылку на Расход средств");

    var html = AnyBalance.requestGet(baseurl + $url.attr('href'));
    getParam(html, result, 'abon', /Абон[а-я\.]*плата[\s\S]*?<span[^>]*>\s*(-?\d[\d\s\.,]*)/i, replaceTagsAndSpaces, parseBalance);
  }


  AnyBalance.setResult(result);
}

function getNsk() {
  var baseurl = 'https://kabinet.nsk.mts.ru/';
  typicalApiInetTv(baseurl);

  /*
   var prefs = AnyBalance.getPreferences();
   AnyBalance.setDefaultCharset('utf-8');

   var baseurl = 'https://kabinet.nsk.mts.ru/';
   //TODO: Лучше перевести на typicalApiInetTv!!!

  var html = AnyBalance.requestPost(baseurl + 'res/modules/AjaxRequest.php?Method=Login', {
    BasicAuth: true,
    'Client': 'mts',
    'Data[Login]': prefs.login,
    'Data[Passwd]': prefs.password,
    'Service': 'API.User.Service'
  });

  var json = getJson(html);

  if (json.Error == true) {
    throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
  }
  var token = json.Result.Result.Token[0];
  html = AnyBalance.requestPost(baseurl + 'res/modules/AjaxRequest.php?Method=GetContainerByPath', {
    'AccessToken': token,
    'Client': 'mts',
    'Service': 'API.Interface.Service'
  });
  json = getJson(html);
  html = JSON.stringify(json);

  var accounts = sumParam(html, null, null, /("Param":\[\{"_":"API.User.Service:ReloadUserCard[\s\S]*?Name[\s\S]*?})/ig);
  checkEmpty(accounts && accounts.length > 0, 'Не удалось найти ни одного счета', true);

  AnyBalance.trace('Аккаунтов: ' + accounts.length);

  var result = {
    success: true
  };

  sumParam(html, result, 'balance', /"([\d.,-]+)(?:&nbsp;)?\s*(?:руб|\\u0440\\u0443\\u0431)/ig, replaceTagsAndSpaces, parseBalance,
    aggregate_sum);

  for (var i = 0; i < accounts.length; i++) {
    var name = getParam(accounts[i], null, null, /Name":"([^"]+)/i);

    sumParam(name, result, '__tariff', /,\s([\d\-]{5,})/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
  }

  AnyBalance.setResult(result);*/

}

function getPrmOld() {
  throw new AnyBalance.Error("Используйте провайдера МТС Комстар-регионы (Сибирь, Урал) чтобы обновлять данные для Екатеринбурга и Перми");

  var prefs = AnyBalance.getPreferences();
  AnyBalance.setDefaultCharset('koi8-r');

  var baseurl = 'https://bill.utk.ru/uportf/arm.pl';

  var html = AnyBalance.requestPost(baseurl, {
    do_login: 1,
    id_menu: 1,
    login: prefs.login,
    passwd: prefs.password,
    ctl00$MainContent$btnEnter: 'Войти'
  });

  if (!getParam(html, null, null, /(do_logout=1)/i)) {
    var error = getParam(html, null, null, /<div[^>]*class="b_warning[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    if (error)
      throw new AnyBalance.Error(error);
    throw new AnyBalance.Error("Не удалось войти в личный кабинет");
  }

  var result = {
    success: true
  };

  getParam(html, result, 'agreement', /Номер договора:([\s\S]*?)(?:\(|<\/li>)/i, replaceTagsAndSpaces);
  getParam(html, result, 'license', /Код лицевого счета:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces);
  getParam(html, result, 'balance', /Баланс:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance3);
  getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<br[^>]*>([\s\S]*?)<br[^>]*>/i, replaceTagsAndSpaces);
  getParam(html, result, 'abon', /абон\. плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance3);
  getParam(html, result, 'username', /class="customer-info"[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/i, replaceTagsAndSpaces);


  if (AnyBalance.isAvailable('internet_cur')) {
    var href = getParam(html, null, null, /<a[^>]*href="arm.pl([^"]*)"[^>]*>Отчет по трафику/i);
    if (!href) {
      AnyBalance.trace("Не найдена ссылка на трафик!");
    } else {
      html = AnyBalance.requestGet(baseurl + href);
      getParam(html, result, 'internet_cur', /ИТОГО[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficPerm);
    }
  }

  if (AnyBalance.isAvailable('balance_tv')) {
    if (AnyBalance.getLevel() < 4) {
      AnyBalance.trace('Для получения баланса ТВ необходима версия AnyBalance 2.8+');
    } else {
      AnyBalance.setCookie('bill.utk.ru', 'service', 2);
      html = AnyBalance.requestGet(baseurl);
      getParam(html, result, 'balance_tv', /Баланс:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, parseBalance3);
    }
  }

  AnyBalance.setResult(result);
}

function parseBalanceRK(_text) {
  var text = _text.replace(/\s+/g, '');
  var rub = getParam(text, null, null, /(-?\d[\d\.,]*)руб/i, replaceTagsAndSpaces, parseBalance) || 0;
  var kop = getParam(text, null, null, /(-?\d[\d\.,]*)коп/i, replaceTagsAndSpaces, parseBalance) || 0;
  var val = rub + kop / 100;
  AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
  return val;
}

function getPrm() {
  //Взято из комстар регионы (сибирь)
  var prefs = AnyBalance.getPreferences();
  AnyBalance.setDefaultCharset('utf-8');

  var baseurl = "https://lka.ural.mts.ru/";

  var city2num = {
    bug: 26,
    buz: 26,
    kem: 29,
    nef: 2,
    nizv: 16,
    novk: 30,
    novt: 26,
    noy: 7,
    nyg: 4,
    orn: 26,
    prm: 26,
    prg: 26,
    pyh: 2,
    rad: 8,
    sor: 26,
    sur: 5,
    tob: 28,
    tum: 26
  }

  var type = prefs.type || 0;
  if (type != 0 && type != 500 && type != 550 && !prefs.city)
    throw new AnyBalance.Error('Для выбранного типа подключения необходимо явно указать ваш город.');


  /*    AnyBalance.trace(JSON.stringify({
          extDvc:prefs.type,
          authCity:(prefs.city && city2num[prefs.city]) || 26,
          authLogin:prefs.login,
          authPassword:prefs.password,
          userAction:'auth'
      }));
  */

  var html = AnyBalance.requestPost(baseurl, {
    extDvc: type,
    authCity: (prefs.city && city2num[prefs.city]) || 26,
    authLogin: prefs.login,
    authPassword: prefs.password,
    userAction: 'auth'
  });

  if (!/\/index\/logout/i.test(html)) {
    var error = getParam(html, null, null, /<div[^>]*background-color:\s*Maroon[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces,
      html_entity_decode);
    if (error)
      throw new AnyBalance.Error(error);
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
  }

  var result = {
    success: true
  };

  getParam(html, result, 'balance', /Баланс:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, parseBalanceRK);
  getParam(html, result, 'status', /Статус:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
  getParam(html, result, 'licschet', /Лицевой счёт:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
  getParam(html, result, '__tariff', /Тарифный план:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);

  AnyBalance.setResult(result);
}

function getKrv() {
  newTypicalLanBillingInetTv('https://lkkirov.pv.mts.ru/index.php');
}

function getVolzhsk() {
  newTypicalLanBillingInetTv('https://internet.mari-el.mts.ru/index.php');
}

function getArkh() {
  newTypicalLanBillingInetTv('https://lk.arkhangelsk.mts.ru/index.php');
}

function getPnz() {
  newTypicalLanBillingInetTv('https://lkpenza.pv.mts.ru/index.php', true);
}

function getNnovTv() {
  newTypicalLanBillingInetTv('https://lktvnn.pv.mts.ru/index.php');
}

function getVnov() {
  newTypicalLanBillingInetTv('https://lk.nov.mts.ru/index.php');
}

function getNnov() {
  var prefs = AnyBalance.getPreferences();
  AnyBalance.setDefaultCharset('windows-1251');

  var baseurl = 'https://lknn.pv.mts.ru/stat/';
  AnyBalance.setAuthentication(prefs.login, prefs.password);

  var html = AnyBalance.requestGet(baseurl);

  if (!/Текущий остаток:/i.test(html))
    throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильные логин, пароль?");

  var result = {
    success: true
  };

  getParam(html, result, 'license', /Лицевой счёт([^<]*)/i, replaceTagsAndSpaces);
  getParam(html, result, 'balance', /Текущий остаток:([\s\S]*?)<br[^>]*>/i, replaceTagsAndSpaces, parseBalance2);
  getParam(html, result, '__tariff', /Текущий тарифный план:([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
  getParam(html, result, 'abon', /Абонентcкая плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
  getParam(html, result, 'username', /Лицевой счёт[^<]*(?:<[^>]*>\s*)*([^<]*)/i, replaceTagsAndSpaces);
  getParam(html, result, 'daysleft', /Этой суммы вам хватит[\s\S]*?<span[^>]+class="imp"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces,
    parseBalance2);

  var url = getParam(html, null, null, /<a[^>]+href="\/stat\/([^"]*)"[^>]*>Информация об услугах/i, null, html_entity_decode);
  if (!url) {
    AnyBalance.trace("Не удалось найти ссылку на информацию об услугах.");
  } else {
    html = AnyBalance.requestGet(baseurl + url);
    var tr = getParam(html, null, null, /Активные услуги(?:[\s\S](?!<\/table>))*?<tr[^>]*>\s*(<td[^>]*>\s*<a[\s\S]*?)<\/tr>/i);
    if (!tr) {
      AnyBalance.trace("Не удалось найти ссылку на информацию об интернет.");
    } else {
      url = getParam(tr, null, null, /<a[^>]+href="\/stat\/([^"]*)/i, null, html_entity_decode);
      html = AnyBalance.requestGet(baseurl + url);
      getParam(html, result, 'agreement', /Договор:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
      getParam(html, result, '__tariff', /Описание услуги:[\s\S]*?<td[^>]*>(?:\s*<b[^>]*>[^<]*<\/b>)?([\s\S]*?)<\/td>/i,
        replaceTagsAndSpaces);
      getParam(html, result, 'internet_cur', /IP трафик[\s\S]*?<small[^>]*>([\s\S]*?)<\/small>/i, replaceTagsAndSpaces, parseBalance2);
    }
  }


  AnyBalance.setResult(result);
}

function getSdv() {
  newTypicalLanBillingInetTv('https://lk.arkhangelsk.mts.ru/index.php');
}

function getVologda() {
  newTypicalLanBillingInetTv('https://lk.vologda.mts.ru/index.php');
}

function getIzhevsk() {
  newTypicalLanBillingInetTv('https://lkizh.pv.mts.ru/index.php');
}

function getKomsomolsk() {
  newTypicalLanBillingInetTv('https://clb.komsomolsk.mts.ru/kom/index.php');
}

function getTula() {
  newTypicalLanBillingInetTv('https://lk-tula.center.mts.ru/index.php');
}

function getSmolensk() {
  newTypicalLanBillingInetTv('https://lk-smolensk.center.mts.ru/index.php');
}

function getRyazan() {
  newTypicalLanBillingInetTv('https://lk-ryazan.center.mts.ru/index.php');
}

function typicalLanBillingInetTv(url) {
  var prefs = AnyBalance.getPreferences();
  AnyBalance.setDefaultCharset('utf-8');

  var html = AnyBalance.requestPost(url, {
    'LoginForm[login]': prefs.login,
    'LoginForm[password]': prefs.password,
    'yt0': 'Войти'
  });

  if (!/r=site\/logout/i.test(html)) {
    throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
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
  var accs = sumParam(html, null, null, /Номер договора[\s\S]*?<\/table>/ig);
  for (var i = 0; i < accs.length; ++i) {
    var act = /Состояние:\s+актив/i.test(accs[i]) ? 'active' : 'inactive';
    var pri = priority[act];
    if (accs[i].indexOf('Израсходовано:') >= 0) {
      if (!isset(accInet[pri]))
        accInet[pri] = accs[i];
    } else {
      if (!isset(accTv[pri]))
        accTv[pri] = accs[i];
    }
  }

  function readAcc(html, isInet) {
    if (html) {
      var tr = getParam(html, null, null,
        /<tr[^>]+class="(?:account|odd|even)"[^>]*>((?:[\s\S](?!<\/tr|Нет подключенных услуг))*?Состояние:\s+актив[\s\S]*?)<\/tr>/i);
      if (!tr)
        tr = getParam(html, null, null,
          /<tr[^>]+class="(?:account|odd|even)"[^>]*>((?:[\s\S](?!<\/tr))*?Состояние:\s+актив[\s\S]*?)<\/tr>/i);
      if (!tr)
        tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>([\s\S]*?)<\/tr>/i);

      if (tr) {
        sumParam(tr, result, '__tariff', [/<!-- Работа с тарифом -->[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/ig], replaceTagsAndSpaces,
          html_entity_decode, aggregate_join);
        if (isInet) {
          getParam(tr, result, 'abon', /Абонентская плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
          getParam(tr, result, 'internet_cur', /Израсходовано:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
        }
      }

      sumParam(html, result, 'agreement', /Номер договора:[^<]*<[^>]*>([^<]*)/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
      getParam(html, result, isInet ? 'balance' : 'balance_tv', /Текущий баланс:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
    }
  }

  function readAccByPriority(arr, isInet) {
    for (var i = 0; i < arr.length; ++i)
      if (arr[i])
        return readAcc(arr[i], isInet);
  }

  readAccByPriority(accInet, true);
  readAccByPriority(accTv);
  getParam(html, result, 'username', /<div[^>]+class="content-aside"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces,
    html_entity_decode);

  AnyBalance.setResult(result);
}

function parseBalance3(text) {
  var val = parseBalance(text.replace(/,/g, ''));
  if (isset(val))
    val = Math.round(val * 100) / 100;
  return val;
}

function parseBalance2(text) {
  var val = parseBalance(text);
  if (isset(val))
    val = Math.round(val * 100) / 100;
  return val;
}

function parseTrafficBytes(text) {
  return parseTraffic(text, 'b');
}

function parseTrafficPerm(text) {
  return parseTraffic(text, 'mb');
}

function getUln() {
  newTypicalLanBillingInetTv('https://lkuln.pv.mts.ru/index.php');
}

function getNorilsk() {
  //https://kabinet.norilsk.mts.ru/auth
  var baseurl = "https://kabinet.norilsk.mts.ru/";
  // typicalApiInetTv(baseurl);
  getSimple(baseurl);
}

function getSimple(baseurl) {
  var prefs = AnyBalance.getPreferences();
  AnyBalance.setDefaultCharset('utf-8');

  var html = AnyBalance.requestGet(baseurl + '', g_headers);

  if (!html || AnyBalance.getLastStatusCode() > 400) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
  }

  html = AnyBalance.requestPost(baseurl + 'res/modules/AjaxRequest.php?Method=Login', {
    'Data[LoginType]': 'Login',
    'Data[Login]': prefs.login,
    'Data[Passwd]': prefs.password,
    'Service': 'API.User.Service',
    'Client': 'mts',
    BasicAuth: 'true',
  });

  var json = getJson(html);

  if (json.Error) {
    var error = json.SoapFault.Text;
    if (error) {
      throw new AnyBalance.Error(error, null, /неверный логин или пароль/i.test(error));
    }
    AnyBalance.trace(JSON.stringify(json));
    throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
  }

  var token = json.Result.Result.Token[0];
  html = AnyBalance.requestPost(baseurl + 'res/modules/AjaxRequest.php?Method=GetContainerByPath', {
    'AccessToken': token,
    'Client': 'mts',
    'Service': 'API.Interface.Service'
  });
  json = getJson(html);

  html = JSON.stringify(json);

  var result = {
    success: true
  };

  AB.getParam(html, result, 'balance', /"clientId":"Balance"[\s\S]*?Value":"([^"]*)"/i, AB.replaceTagsAndSpaces, AB.parseBalance);
  AB.getParam(html, result, 'username', /Description=\\"[^"]*фио[\s\S]*?Value=\\"([^"]*)/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'license', /Description=\\"[^"]*фио[\s\S]*?(?:[\s\S]*?Name=\\){3}"([^"\\]*)[\\"]/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'agreement', /"Name":"Договор"[\s\S]*?Value":"([^"]*)"/i, AB.replaceTagsAndSpaces);

  if (AnyBalance.isAvailable('abon')) {
    html = AnyBalance.requestPost(baseurl + 'res/modules/AjaxRequest.php?Method=GetPageByPath', {
      'Data[ServerPath]': 'HomePage',
      'AccessToken': token,
      'Client': 'mts',
      'Service': 'API.Interface.Service'
    });
    json = getJson(html);
    html = JSON.stringify(json);
    AnyBalance.trace(html);

    getParam(html, result, 'abon', /Ежемесячная плата за пакет услуг[^<]*?:([^<]*)/, replaceTagsAndSpaces, parseBalance);
  }
  AnyBalance.setResult(result);
}

function typicalApiInetTv(baseurl) {
  var prefs = AnyBalance.getPreferences();
  AnyBalance.setDefaultCharset('utf-8');

  var html = AnyBalance.requestPost(baseurl + 'res/modules/AjaxRequest.php?Method=Login', {
    'Data[LoginType]': 'Login',
    'Data[Login]': prefs.login,
    'Data[Passwd]': prefs.password,
    'Service': 'API.User.Service',
    'Client': 'mts',
    BasicAuth: 'true',
  });

  var json = getJson(html);

  if (json.Error) {
    var error = json.SoapFault.Text;
    if (error) {
      throw new AnyBalance.Error(error, null, /неверный логин или пароль/i.test(error));
    }
    AnyBalance.trace(JSON.stringify(json));
    throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
  }

  var token = json.Result.Result.Token[0];
  html = AnyBalance.requestPost(baseurl + 'res/modules/AjaxRequest.php?Method=GetContainerByPath', {
    'AccessToken': token,
    'Client': 'mts',
    'Service': 'API.Interface.Service'
  });
  json = getJson(html);

  var result = {
    success: true
  };
  /**
  	Находим группу контролов, чьё поле удовлетворяет регулярному выражению
  */
  function findControls(child, re, field) {
    if (!field) field = "ClientId";
    if (re.test(child[field]))
      return child;
    for (var i = 0; child.ChildrenList && child.ChildrenList.Container && i < child.ChildrenList.Container.length; ++i) {
      var ch = findControls(child.ChildrenList.Container[i], re);
      if (ch)
        return ch;
    }
  }

  /**
  	Находим контрол, чьё поле удовлетворяет регулярному выражению
  */
  function findControl(controls, re, field) {
    if (!field) field = "ClientId";
    for (var i = 0; i < controls.length; ++i) {
      if (re.test(controls[i][field]))
        return controls[i];
    }
  }

  function sumTariffNames(controls, result) {
    for (var i = 0; i < controls.length; ++i) {
      sumParam(controls[i].Name, result, '__tariff', null, replaceTagsAndSpaces, null, aggregate_join);
    }
  }

  var fioacc = findControls(json.Result.Result, /UserCardPart1/i);
  var taragr = findControls(json.Result.Result, /UserCardPart2/i);
  if (!fioacc || !fioacc) {
    AnyBalance.trace(JSON.stringify(json));
    throw AnyBalance.Error('Не удалось найти карточку пользователя');
  }

  //Находим тарифный контрол
  var tariff = findControl(taragr.ControlList.Control, /_LK$/);
  var first = /tv/i.test(tariff.ClientId) ? 'tv' : 'internet'; //Определяем, tv это или интернет
  var second = first == 'tv' ? 'internet' : 'tv'
  var data = {};
  data[first] = {
    fioacc: fioacc,
    taragr: taragr
  };


  //Найдем активный и второй лицевой счет
  var secondId;
  for (var i = 0; i < fioacc.ControlList.Control.length; ++i) {
    var c = fioacc.ControlList.Control[i];
    if (c.Type == 'Node' && /ReloadUserCard/.test(JSON.stringify(c.ParamList))) {
      try {
        if (c.AttrList.Attr[0]._ == 'active')
          data[first].license = c.Name;
      } catch (e) {
        data[second] = {
          license: c.Name
        };
        secondId = c.ServerId;
      }
    }
  }

  if (secondId) {
    html = AnyBalance.requestPost(baseurl + 'res/modules/AjaxRequest.php?Method=ReloadUserCard', {
      'Data[AccountId]': secondId,
      'AccessToken': token,
      'Client': 'mts',
      'Service': 'API.User.Service'
    });
    json = getJson(html);

    fioacc = findControls(json.Result.Container, /UserCardPart1/i);
    taragr = findControls(json.Result.Container, /UserCardPart2/i);
    if (!fioacc || !fioacc) {
      AnyBalance.trace(JSON.stringify(json));
      throw AnyBalance.Error('Не удалось найти карточку пользователя для второго лицевого счета');
    }

    data[second].fioacc = fioacc;
    data[second].taragr = taragr;
  }

  //Теперь в data есть инфа по счету internet и, возможно, tv

  var result = {
    success: true
  };

  var active = data.internet ? 'internet' : 'tv'; //Счет, по которому в первую очередь получаем инфу
  var activeData = data[active],
    ctl;

  getParam(activeData.fioacc.ControlList.Control[0].Value, result, 'username');
  getParam(activeData.license, result, 'license');

  if (data.internet) {
    ctl = findControl(data.internet.taragr.ControlList.Control, /Balance/i);
    getParam(ctl && ctl.Value, result, 'balance', null, null, parseBalance);

    tariff = findControl(data.internet.taragr.ControlList.Control, /_LK$/);
    sumTariffNames(tariff.ChildrenList.Control, result);
  }
  if (data.tv) {
    ctl = findControl(data.tv.taragr.ControlList.Control, /Balance/i);
    getParam(ctl && ctl.Value, result, 'balance_tv', null, null, parseBalance);

    tariff = findControl(data.tv.taragr.ControlList.Control, /_LK$/);
    sumTariffNames(tariff.ChildrenList.Control, result);
  }

  ctl = findControl(activeData.taragr.ControlList.Control, /GeneralContract/i);
  getParam(ctl && ctl.Value, result, 'agreement');

  if (AnyBalance.isAvailable('abon')) {
    //Абонентская плата в другом запросе
    html = AnyBalance.requestPost(baseurl + 'res/modules/AjaxRequest.php?Method=GetPageByPath', {
      'Data[ServerPath]': 'HomePage',
      'AccessToken': token,
      'Client': 'mts',
      'Service': 'API.Interface.Service'
    });
    json = getJson(html);
    html = JSON.stringify(json); //Чтобы русские буквы стали русскими

    getParam(html, result, 'abon', /Ежемесячная плата за пакет услуг[^<]*?:([^<]*)/, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'last_payment_date', /Последний платеж[^<]*?:([^<]*)/, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'last_payment_sum', /Последний платеж[\s\S]*?Сумма:([^<]*)/, replaceTagsAndSpaces, parseBalance);
  }

  AnyBalance.setResult(result);
}


function getMagnit() {
  newTypicalLanBillingInetTv('https://lkmagn.ural.mts.ru/index.php');
}


function getMiass() {
  var baseurl = "https://lkmiass.ural.mts.ru/";
  newTypicalLanBillingInetTv(baseurl + 'index.php');
}

function getKurgan() {
  AnyBalance.setOptions({
    SSL_ENABLED_PROTOCOLS: ['TLSv1'],
  });
  newTypicalLanBillingInetTv('https://lkkurgan.ural.mts.ru/index.php', true);
}

function getBarnaul() {
  var prefs = AnyBalance.getPreferences();
  AnyBalance.setDefaultCharset('utf-8');

  var baseurl = 'https://kabinet.barnaul.mts.ru/';
  //TODO: Лучше перевести на typicalApiInetTv!!!

  var html = AnyBalance.requestPost(baseurl + 'res/modules/AjaxRequest.php?Method=Login', {
    BasicAuth: true,
    'Client': 'mts',
    'Data[Login]': prefs.login,
    'Data[Passwd]': prefs.password,
    'Service': 'API.User.Service'
  });

  var json = getJson(html);

  if (json.Error == true) {
    throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
  }
  var token = json.Result.Result.Token[0];
  html = AnyBalance.requestPost(baseurl + 'res/modules/AjaxRequest.php?Method=GetContainerByPath', {
    'AccessToken': token,
    'Client': 'mts',
    'Service': 'API.Interface.Service'
  });
  json = getJson(html);
  html = JSON.stringify(json);

  AnyBalance.trace(html);

  var result = {
    success: true
  };
  //Вначале попытаемся найти активный тариф
  getParam(html, result, '__tariff', /Name[\s\S]{1,20}Тариф\s*'([\s\S]*?)'/i, replaceTagsAndSpaces, html_entity_decode);
  getParam(html, result, 'balance', /([\d.\-,]{1,10})(?:\&nbsp;|\s)руб/i, replaceTagsAndSpaces, parseBalance2);

  /*  getParam(html, result, 'abon', /Абонентская плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
      getParam(html, result, 'internet_cur', /Израсходовано:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
      getParam(html, result, 'agreement', /Номер договора:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces);
      getParam(html, result, 'username', /Мои аккаунты[\s\S]{1,150}<strong>([\s\S]*?)<\/strong>/i, null);
  */
  AnyBalance.setResult(result);
}

function getNovokuz() {
  var prefs = AnyBalance.getPreferences();
  AnyBalance.setDefaultCharset('utf-8');

  var baseurl = 'https://kabinet.kemerovo.mts.ru/';
  //TODO: Лучше перевести на typicalApiInetTv!!!

  var html = AnyBalance.requestPost(baseurl + 'res/modules/AjaxRequest.php?Method=Login', {
    'Data[LoginType]': 'PPPoE',
    'BasicAuth': true,
    'Client': 'mts',
    'Data[Login]': prefs.login,
    'Data[Passwd]': prefs.password,
    'Service': 'API.User.Service'
  }, addHeaders({
    Referer: baseurl + 'auth',
    'X-Requested-With': 'XMLHttpRequest'
  }));

  var json = getJson(html);

  if (json.Error == true) {
    throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
  }
  var token = json.Result.Result.Token[0];
  html = AnyBalance.requestPost(baseurl + 'res/modules/AjaxRequest.php?Method=GetContainerByPath', {
    'AccessToken': token,
    'Client': 'mts',
    'Service': 'API.Interface.Service'
  });
  json = getJson(html);
  html = JSON.stringify(json);

  AnyBalance.trace(html);

  var result = {
    success: true
  };

  getParam(html, result, '__tariff', /TarifGroupId[\s\S]*?Name["']:["']([^"']+)"/i, replaceTagsAndSpaces, html_entity_decode);
  getParam(html, result, 'balance', /([\d.\-,]{1,10})(?:\&nbsp;|\s)руб/i, replaceTagsAndSpaces, parseBalance2);
  getParam(html, result, 'agreement', /GeneralContract[\s\S]*?Value["']:["']([^"']+)"/i, replaceTagsAndSpaces, html_entity_decode);

  AnyBalance.setResult(result);
}

function getVladimir() {
  newTypicalLanBillingInetTv('https://lk-vladimir.center.mts.ru/index.php');
}

function getBelgorod() {
  newTypicalLanBillingInetTv('https://lk-belgorod.center.mts.ru/index.php');
}

function getSaratov() {
  newTypicalLanBillingInetTv('https://lksrt.pv.mts.ru/internet/index.php');
}

function getSaratovTv() {
  newTypicalLanBillingInetTv('https://lksrt.pv.mts.ru/ktv/index.php');
}

function getChita() {
  newTypicalLanBillingInetTv('https://clb.primorye.mts.ru/chita/index.php');
}

function getNahodka() {
  newTypicalLanBillingInetTv('https://clb.primorye.mts.ru/cvld/index.php');
}

function getAmur() {
  newTypicalLanBillingInetTv('https://clb.amur.mts.ru/cblg/index.php');
}

function getOrel() {
  newTypicalLanBillingInetTv('https://lk-orel.center.mts.ru/index.php');
}

function getPiter() {
  newTypicalLanBillingInetTv('https://lk.spb.mts.ru/index.php');
}

function getBalakovo() {
  newTypicalLanBillingInetTv('https://lksrt.pv.mts.ru/bal/index.php');
}

function getYar() {
  newTypicalLanBillingInetTv('https://lk-yaroslavl.center.mts.ru/index.php');
}

function getKursk() {
  newTypicalLanBillingInetTv('https://lk-kursk.center.mts.ru/index.php');
}

function newTypicalLanBillingInetTv(baseurl, need_token) {
  var urlAjax = baseurl + '?r=account/vgroups&agrmid=';
  var urlIndex = baseurl + '?r=site/login';

  var prefs = AnyBalance.getPreferences();
  AnyBalance.setDefaultCharset('utf-8');

  if (prefs.__dbg) {
    var html = AnyBalance.requestGet(baseurl + '?r=account/index');
  } else {
    var html = AnyBalance.requestGet(urlIndex);

    var params = {
      'LoginForm[login]': prefs.login,
      'LoginForm[password]': prefs.password,
      'yt0': 'Войти'
    };

    if(need_token) {
      var cookies = AnyBalance.getCookies();
      for (var i = 0; i < cookies.length; i++) {
        if (cookies[i].name == "YII_CSRF_TOKEN") {
          var cookie_value = cookies[i].value;
          break;
        }
      }

      if (!cookie_value) {
        throw new AnyBalance.Error("Не удалось получить токен.");
      }

      params['YII_CSRF_TOKEN'] = cookie_value;
    }
      html = AnyBalance.requestPost(urlIndex, params);
  }

  if (!/r=site\/logout/i.test(html)) {
    var error = getParam(html, null, null, [/alert-error[^>]*"(?:[^>]*>){2}([\s\S]*?)<\/div>/i,
      /Необходимо исправить следующие ошибки:([\s\S]*?)<\/ul>/i
    ], replaceTagsAndSpaces, html_entity_decode);
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
          accTv[pri] = response;
        // Это интернет
      } else {
        if (!isset(accInet[pri]))
          accInet[pri] = response;
      }
    }
  }

  var usedAccs = {}; //аккаунты только уникальные собираем

  function readAcc(json, isInet) {
    if (json) {
      getParam(json.bal, result, isInet ? 'balance' : 'balance_tv');
      if (!usedAccs['acc_' + json.acc]) { //аккаунты только уникальные собираем
        sumParam(json.acc, result, 'agreement', null, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
        usedAccs['acc_' + json.acc] = true;
      }

      if (!/Выключен/i.test(json.state) && !/не\s*доступно/i.test(json.services)) {
        sumParam(json.abon, result, 'abon', null, null, parseBalance, aggregate_sum);
        sumParam(json.tarifdescr, result, '__tariff', null, null, null, aggregate_join);
      }
    }
  }

  function readAccByPriority(arr, isInet) {
    for (var i = 0; i < arr.length; ++i)
      if (arr[i])
        return readAcc(arr[i], isInet);
  }

  readAccByPriority(accInet, true);
  readAccByPriority(accTv);

  getParam(html, result, 'username', /<div[^>]+class="content-aside"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces,
    html_entity_decode);

  AnyBalance.setResult(result);
}
