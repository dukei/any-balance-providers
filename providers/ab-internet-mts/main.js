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
  vlggrd: getRostov,
  nsk: getNsk,
  prm: getPrm,
  ekt: getPrm,
  krv: getKrv,
  vnov: getVnov,
  nnov: getNnovTv,
  nnov_tv: getNnovTv,
  sdv: getSdv,
  vlgd: getVologda,
  izh: getIzhevsk,
  irk: getIrkutsk,
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
  saratov_tv: getSaratov,
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
  kem: getNovokuz,
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

  var headers = addHeaders({'Content-Type': 'application/json', Accept: 'application/json'});
  // Заходим на главную страницу
  var html = AnyBalance.requestPost(baseurl + "api/auth", JSON.stringify({
    login: prefs.login,
    password: prefs.password,
    type: 'personalAccount'
  }), headers);

  var json = getJson(html);

  if (json.error) {
    var error = json.message;
    if (error)
      throw new AnyBalance.Error(error, null, /парол|format/i.test(error));

    AnyBalance.trace(html);
    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
  }

  var result = {
    success: true
  };

  var data = json.data[0];
  getParam(data.session.user.client, result, 'username');
  getParam(data.session.user.contrNum, result, 'agreement');
  getParam(data.session.user.personalAccount, result, 'license');
  getParam(data.session.user.balance, result, 'balance', null, null, parseBalance);
  getParam(data.session.user.feeDiscount, result, 'abon', null, null, parseBalance);

  for(var i=0; i<data.resources.length; ++i){
  	var r = data.resources[i];
  	sumParam(r.tariff.name, result, '__tariff', null, null, null, aggregate_join);
  }

  if(AnyBalance.isAvailable('last_payment_sum', 'last_payment_date')){
  	html = AnyBalance.requestGet(baseurl + 'api/payments/history?start=' + getFormattedDate({format: 'YYYY-MM-DD', offsetMonth: 6}) + '&end=' + getFormattedDate('YYYY-MM-DD'), headers);
  	var json = getJson(html);

  	data = json.data[0];
  	getParam(data.rows[0] && data.rows[0].amount, result, 'last_payment_sum', null, null, parseBalance);
  	getParam(data.rows[0] && data.rows[0].date, result, 'last_payment_date', null, null, parseDateISO);
  }

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

  function goToRef(info, name){
    var urls = getElements(info, [/<a\b/ig, typeof(name) == 'string' ? new RegExp(name, 'i') : name]);
    if (urls.length < 1)
      throw new AnyBalance.Error("Невозможно найти ссылку на " + (typeof(name) == 'string' ? name : name.source));
    
    var html = AnyBalance.requestGet(baseurl + getParam(urls[0], null, null, /href="([^"]*)/i, replaceHtmlEntities));
    return html;
  }

  // Находим ссылку "Счетчики услуг"
  var html = goToRef(info, 'Счетчики услуг');
  var result = {
    success: true
  };

  //Тарифный план
  getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?>(.*?)</i, replaceTagsAndSpaces);
  getParam(html, result, 'daysleft', /(\d+) дн\S+ до списания абонентской платы/i, null, parseBalance3);

  // Баланс
  getParam(html, result, 'balance', /<span[^>]+customer-info-balance[^>]*>([\s\S]*?)(?:<\/strong>|<\/span>)/i, replaceTagsAndSpaces, parseBalance);

  // Лицевой счет
  getParam(html, result, 'license', /Лицевой счет:[\s\S]*?>(.*?)</i, replaceTagsAndSpaces);
  // Номер договора
  getParam(html, result, 'agreement', /Договор:[\s\S]*?>(.*?)</i, replaceTagsAndSpaces);
  // ФИО
  getParam(html, result, 'username', /<h3[^>]*>([\s\S]*?)<\/h3>/i, replaceTagsAndSpaces);

  if (AnyBalance.isAvailable('internet_cur')) {
    // Находим ссылку "Счетчики услуг"
    var matches = html.match(/<div class="gridium sg">\s*(<table>[\s\S]*?<\/table>)/i);
    if (matches) {
      	var row = getElements(matches[1], [/<tr/ig, /<td[^>]*>(?:[\s\S](?!<\/td>))*трафик/i])[0];
   	 	getParam(row, result, 'internet_cur', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }
  }

  if (AnyBalance.isAvailable('abon')) {
    // Находим ссылку "Расход средств"
 	html = goToRef(info, 'Расход средств');
    getParam(html, result, 'abon', /Абон[а-я\.]*плата[\s\S]*?<span[^>]*>\s*(-?\d[\d\s\.,]*)/i, replaceTagsAndSpaces, parseBalance);
  }

  AnyBalance.setResult(result);
}

function getNsk() {
  var baseurl = 'https://kabinet.nsk.mts.ru/';
  typicalApiInetTvNew(baseurl);
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

    var html = AnyBalance.requestPost(baseurl, {
        extDvc:prefs.type,
        authCity:(prefs.city && city2num[prefs.city]) || 26,
        authLogin:prefs.login,
        authPassword:prefs.password,
        userAction:'auth'
    });

    if(!/\/index\/logout/i.test(html)){
        var divs = getElements(html, /<[^>]+error_hint/ig), errors = [];
        for(var i=0; i<divs.length; ++i){
        	if(!/display:\s*none/i.test(divs[i]))
        		errors.push(replaceAll(divs[i], replaceTagsAndSpaces));
        }
        
        error = errors.join('; ');
        if(error)
            throw new AnyBalance.Error(error, null, /парол|логин/i.test(error));
		
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }
    var result = {success: true};
	
	if(!prefs.accnum) {
		getParam(html, result, 'balance', /<b[^>]+\bsumm\b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'status', /<span[^>]+b-lk-fix-tarif__activated[^>]*>([\S\s]*?)<\/span>/i, replaceTagsAndSpaces);
		getParam(html, result, 'licschet', /Номер лицевого счета\s*<\/div>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		getParam(html, result, '__tariff', /<div[^>]+b-lk-fix-tarif__name[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	} else {
		// Теперь таблица услуг
		var table = getParam(html, null, null, /(<table[\s\S]{1,150}id="list"[\s\S]*?<\/table>)/i);
		if(!table)
			throw new AnyBalance.Error('Не найдена таблица услуг. Сайт изменен?.');
		
		var re = /(<tr[\s\S]*?<\/tr>)/ig;
		html.replace(re, function(tr) {
			if(AnyBalance.isSetResultCalled())
				return; //Если уже вернули результат, то дальше крутимся вхолостую
			
			var accnum = (prefs.accnum || '').toUpperCase();
			var acc = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){1}\s*(?:<b>|<a href[\s\S]*?>|)\s*([\s\S]*?)\s*(?:<\/b>|<\/a>|)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
			//var acc = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){2}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
			if(!prefs.accnum || /*(name && name.toUpperCase().indexOf(accnum) >= 0) || */(acc && acc.toUpperCase().indexOf(accnum) >= 0))
			{
				getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){5}\s*(?:<b>|<a href[\s\S]*?>|)\s*([\s\S]*?)\s*(?:<\/b>|<\/a>|)\s*<\/td>/i, replaceTagsAndSpaces, parseBalanceRK);
				//getParam(html, result, 'status', /Статус:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(tr, result, 'licschet', /(?:[\s\S]*?<td[^>]*>){1}\s*(?:<b>|<a href[\s\S]*?>|)\s*([\s\S]*?)\s*(?:<\/b>|<\/a>|)\s*<\/td>/i, replaceTagsAndSpaces);
				//getParam(html, result, '__tariff', /Тарифный план:[\S\s]*?<strong[^>]*>([\S\s]*?)<\/strong>/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(tr, result, 'usluga', /(?:[\s\S]*?<td[^>]*>){4}\s*(?:<b>|<a href[\s\S]*?>|)\s*([\s\S]*?)\s*(?:<\/b>|<\/a>|)\s*<\/td>/i, replaceTagsAndSpaces);
				AnyBalance.setResult(result);
				return;
			}
		});
	}
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
  newTypicalLanBillingInetTv_1('https://lkpenza.pv.mts.ru/index.php');
}

function getNnovTv() {
  newTypicalLanBillingInetTv('https://lktvnn.pv.mts.ru/index.php');
}

function getVnov() {
  newTypicalLanBillingInetTv('https://lk.nov.mts.ru/index.php');
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
          null, aggregate_join);
        if (isInet) {
          getParam(tr, result, 'abon', /Абонентская плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
          getParam(tr, result, 'internet_cur', /Израсходовано:([^<]*)/i, replaceTagsAndSpaces, parseBalance2);
        }
      }

      sumParam(html, result, 'agreement', /Номер договора:[^<]*<[^>]*>([^<]*)/ig, replaceTagsAndSpaces, null, aggregate_join);
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
  getParam(html, result, 'username', /<div[^>]+class="content-aside"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);

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
  var baseurl = "https://kabinet.norilsk.mts.ru/";
  typicalApiInetTvNew(baseurl);
}

function typicalApiInetTvNew(baseurl) {
  var prefs = AnyBalance.getPreferences();
  AnyBalance.setDefaultCharset('utf-8');

  var params = {
    'Data[LoginType]': 'Login',
    'Data[CheckLogin]': '1',
    'Data[Login]': prefs.login,
    'Data[Passwd]': prefs.password,
    'Service': 'API.User.Service',
    'Client': 'mts',
    BasicAuth: 'true',
  }

  var loginTypes = ['Login', 'AccountNumber', 'PPPoE'], html, json, jsonLogin;
  AnyBalance.trace('Определим тип введенного логина');
  for(var i=0; i<loginTypes.length; ++i){
  	params['Data[LoginType]'] = loginTypes[i];
  	html = AnyBalance.requestPost(baseurl + 'res/modules/AjaxRequest.php?Method=Login', params);
  	json = getJson(html);
  	if(!jsonLogin)
  		jsonLogin = json;
  	if(json.Error){
  	  AnyBalance.trace('Ошибка проверки ' + loginTypes[i] + ': ' + html);
  	  continue;
  	}else{
  	  AnyBalance.trace('Введенный логин это ' + loginTypes[i]);
  	  break;
  	}
  }

  if(json.Error){
  	json = jsonLogin; //Чтобы ошибку показывать из логина
  }else{
  	delete params['Data[CheckLogin]'];
    html = AnyBalance.requestPost(baseurl + 'res/modules/AjaxRequest.php?Method=Login', params);
  	json = getJson(html);
  }

  if (json.Error) {
    var error = json.Status.Text;
    if (error) {
      throw new AnyBalance.Error(error, null, /Парол|не существует/i.test(error));
    }
    AnyBalance.trace(JSON.stringify(json));
    throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
  }

  var token = json.Result.Result[0];
  html = AnyBalance.requestPost(baseurl + 'res/modules/AjaxRequest.php?Method=GetPageByPath', {
  	'Data[ServerPath]': 'ServiceState',
    'AccessToken': token,
    'Client': 'mts',
    'Service': 'API.Interface.Service'
  });
  json = getJson(html);

  var result = {
    success: true
  };
  /**
  	Находим все наиболее высокие чайлды, чьё поле удовлетворяет регулярному выражению
  */
  function findChildren(child, re, field) {
    if (!field) field = "ClientId";
    if (re.test(child[field]))
      return [child];

    var children = [];
    var childrenList = [child];
    if(!Array.isArray(child)){
    	childrenList = (child.ChildrenList || [])
    		.concat(child.ControlList || [])
    		.concat(child.ContainerLinkList || [])
    		.concat(child.Container || []);
    }

    for (var i = 0; childrenList && i < childrenList.length; ++i) {
      var ch = findChildren(childrenList[i], re);
      if (ch)
      	children = children.concat(ch);
    }
    return children;
  }

  /**
  	Находим контрол, чьё поле удовлетворяет регулярному выражению
  */
  function findChild(child, re, field) {
  	return findChildren(child, re, field)[0];
  }

  var initialContainer = json.Result.Result;

  var fio = findChild(initialContainer, /FIO/i);

  getParam(fio.Value, result, 'fio');

  var accs = [], curAcc;

  var licschet = findChild(json.Result.Result, /^AccountId$/i);
  if(licschet){
  	var value = licschet.Value;
  	for(var i=0; i<licschet.ChildrenList.length; ++i){
  		var child = licschet.ChildrenList[i];
  		accs.push(child);
  		if(child.Value == value){
  			AnyBalance.trace('Найден лицевой счет (текущий) ' + child.Name);
  			curAcc = child;
  		}else{
  			AnyBalance.trace('Найден лицевой счет ' + child.Name);
  		}
  	}
  }

  var container;
  for(var ia=0; ia<accs.length; ++ia){
  	  var acc = accs[ia];
  	  if(acc === curAcc){
  	  	container = initialContainer;
  	  }else{
        html = AnyBalance.requestPost(baseurl + 'res/modules/AjaxRequest.php?Method=GetServiceState', {
        	'Data[AccountId]': acc.Value,
          'AccessToken': token,
          'Client': 'mts',
          'Service': 'API.Contract.Service'
        });
        container = getJson(html).Result.Result;
  	  }

  	  AnyBalance.trace('Разбираем ' + acc.Name);
  	  var tar = findChildren(container, /ServiceState_MainBody_/i);
      var bal = findChild(container, /ServiceState_Balance/i);

  	  var curbal = findChild(bal, /Current_Balance/i);
  	  var balName = /телевид|тв/i.test(acc.Name) && !/шпд|интернет/i.test(acc.Name) ? 'balance_tv' : 'balance';
  	  sumParam(curbal.Value, result, balName, null, null, parseBalance, aggregate_sum);

 	  var abon = findChild(bal, /MonthPayment/i);
      sumParam(abon.Value, result, 'abon', null, null, parseBalance, aggregate_sum);

      for(var i=0; i<tar.length; ++i){
      	var t = findChild(tar[i], /^CurTarif$/i);
      	sumParam(t.Value, result, '__tariff', null, null, null, aggregate_join);
      }

  	  var agr = findChild(container, /^GeneralContract$/i);
  	  sumParam(agr.Value, result, 'agreement', null, replaceTagsAndSpaces, null, aggregate_join);

	  sumParam(acc.Name, result, 'license', /[^,]*$/i, replaceTagsAndSpaces, null, aggregate_join);
  }

  if(AnyBalance.isAvailable('last_payment_sum', 'last_payment_date')){
  	var accountId = findChild(initialContainer, /^AccountId$/i).Value;

    html = AnyBalance.requestPost(baseurl + 'res/modules/AjaxRequest.php?Method=GetPaymentHistoryBodyWeb', {
      'Data[DateBegin]': getFormattedDate({format: 'YYYY-MM-DD', offsetMonth: 6}),
      'Data[DateEnd]': getFormattedDate({format: 'YYYY-MM-DD'}),
      'Data[AccountId]': accountId,
      'AccessToken': token,
      'Client': 'mts',
      'Service': 'API.Payment.Service'
    });
    json = getJson(html);

    var tbl = findChild(json.Result, /PaymentHistory_body/i), row;
    if(tbl)
    	row = findChild(tbl, /GroupCtrlBody/i);
    if(row){
    	getParam(row.ChildrenList[0].Value, result, 'last_payment_date', null, null, parseDateISO);
    	getParam(row.ChildrenList[2].Value, result, 'last_payment_sum', null, null, parseBalance);
    }else{
    	AnyBalance.trace('Не удалось найти историю платежей...');
    }
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

  var token = json.Result.Result[0];
  html = AnyBalance.requestPost(baseurl + 'res/modules/AjaxRequest.php?Method=GetContainerByServerId', {
  	'Data[Value]': 'Menu',
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
  if (!fioacc || !taragr) {
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
    if (!fioacc || !taragr) {
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
   	sumTariffNames(tariff.ChildrenList ? tariff.ChildrenList.Control : [tariff], result);
  }
  if (data.tv) {
    ctl = findControl(data.tv.taragr.ControlList.Control, /Balance/i);
    getParam(ctl && ctl.Value, result, 'balance_tv', null, null, parseBalance);

    tariff = findControl(data.tv.taragr.ControlList.Control, /_LK$/);
    sumTariffNames(tariff.ChildrenList ? tariff.ChildrenList.Control : [tariff], result);
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
  newTypicalLanBillingInetTv_1('https://lkmagn.ural.mts.ru/index.php');
}


function getMiass() {
  var baseurl = "https://lkmiass.ural.mts.ru/";
  newTypicalLanBillingInetTv(baseurl + 'index.php');
}

function getKurgan() {
  AnyBalance.setOptions({
    SSL_ENABLED_PROTOCOLS: ['TLSv1'],
  });
  newTypicalLanBillingInetTv_1('https://lkkurgan.ural.mts.ru/index.php');
}

function getBarnaul() {
  var baseurl = 'https://kabinet.barnaul.mts.ru/';
  typicalApiInetTvNew(baseurl);
}

function getNovokuz() {
  var baseurl = 'https://kabinet.kemerovo.mts.ru/';
  typicalApiInetTvNew(baseurl);
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

function getChita() {
  newTypicalLanBillingInetTv('https://clb.primorye.mts.ru/chita/index.php');
}

function getIrkutsk() {
  newTypicalLanBillingInetTv_1('https://clb.primorye.mts.ru/irk/index.php');
}

function getNahodka() {
  newTypicalLanBillingInetTv('https://clb.primorye.mts.ru/cvld/index.php');
}

function getAmur() {
  newTypicalLanBillingInetTv('https://clb.amur.mts.ru/cblg/index.php');
}

function getOrel() {
  newTypicalLanBillingInetTv_1('https://lk-orel.center.mts.ru/index.php');
}

function getPiter() {
  newTypicalLanBillingInetTv('https://lk.spb.mts.ru/index.php');
}

function getBalakovo() {
  newTypicalLanBillingInetTv_1('https://lksrt.pv.mts.ru/bal/index.php');
}

function getYar() {
  newTypicalLanBillingInetTv('https://lk-yaroslavl.center.mts.ru/index.php');
}

function getKursk() {
  newTypicalLanBillingInetTv('https://lk-kursk.center.mts.ru/index.php');
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

      if (!/Выключен/i.test(json.state) && !/не\s*доступно/i.test(json.services)) {
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

function newTypicalLanBillingInetTv_1(baseurl) {
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
    var error = getElement(html, /<div[^>]+b-error_hint/i, replaceTagsAndSpaces);
    if (error)
      throw new AnyBalance.Error(error, null, /парол/i.test(error));

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

  var agreementSelect = getElement(html, /<select[^>]+locationsList/i);
  var agrs = getElements(agreementSelect, /<option/ig);
  var agreements = [];
  for(var i=0; i<agrs.length; ++i){
  	var agr = agrs[i];
  	var id = getParam(agr, null, null, /<option[^>]+value="([^"]*)/i, replaceHtmlEntities);
  	var num = replaceAll(agr, replaceTagsAndSpaces);
  	var selected = getParam(agr, null, null, /<option[^>]+(selected)/i, null, function(){return true});
  	var info = selected && html;
  	agreements.push({id: id, num: num, selected: selected, info: info});
  	
  }

  AnyBalance.trace('Найдено счетов: ' + agreements.length);

  for (var i = 0; i < agreements.length; ++i) {
  	var agr = agreements[i];
  	var html = agr.info || AnyBalance.requestGet(baseurl + '?r=account/index&agrmid=' + agr.id);

    var balance = getElement(html, /<div[^>]+fix-balance__tarif/i, replaceTagsAndSpaces, parseBalance);
    var abon = getElement(html, /<div[^>]+fix-block__tarif/i, replaceTagsAndSpaces, parseBalance);

    var tariff_blocks = getElements(html, /<div[^>]+fix-tarif__inner/ig);
    // Может быть несколько услуг по одному счету
    AnyBalance.trace('Услуг по счету ' + agr.num + ': ' + tariff_blocks.length);

    for(var j=0; j<tariff_blocks.length; ++j){
    	var tariff_block = tariff_blocks[j];
        var tariff = getElement(tariff_block, /<div[^>]+fix-tarif__name/i, replaceTagsAndSpaces);
        if(tariff == 'Разовые и периодические услуги')
        	continue; //Неинтересная услуга
	    var status = getElement(tariff_block, /<span[^>]+tarif__activated/i, replaceTagsAndSpaces);
	    var servicesBlock = getElement(html, /<ul[^>]+fix-services__drop/i);
	    var services = sumParam(servicesBlock, null, null, /<div[^>]+fix-services__name[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, null, aggregate_join);

	    var act = /услуга активна/i.test(status) ? 'active' : 'inactive';
      	var pri = priority[act];

      	var response = {
        	bal: balance,
        	abon: abon,
        	acc: agr.num,
        	accId: agr.id,
        	tarifdescr: tariff,
        	state: status,
        	services: services || ''
      	};

      	if (/\BТВ\B|Телевидение/.test(tariff) && !/ШПД/.test(tariff)) {
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
        sumParam(json.acc, result, 'agreement', null, replaceTagsAndSpaces, null, aggregate_join);
        usedAccs['acc_' + json.acc] = true;
      }

      if (!/Выключен|неактив/i.test(json.state) && !/не\s*доступно/i.test(json.services)) {
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

  getParam(html, result, 'username', /Персональная информация[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);

  AnyBalance.setResult(result);
}
