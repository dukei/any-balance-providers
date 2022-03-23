/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
  'Accept-Encoding': 'gzip, deflate',
  'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
  'Connection': 'keep-alive',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.135 Safari/537.36'
};

var g_region_change = {
	rzn: {task: 'login', inputName: 'accountNumberAbn'},
	kasimov: {task: 'login2', inputName: 'accountNumber'},
	rznObl: {task: 'login3', inputName: 'accountNumber'},
};

var g_prefix = {
  "ИТОГО недоплата": "TUnder",
  "ИТОГО переплата": "TOver",
}

var replaceSpaces = [/[\s�]+/g, ''],
    replaceFloat = [/[\u2212\u2013\u2014–]/ig, '-', replaceSpaces, /'/g, '', /,/g, '.', /\.([^.]*)(?=\.)/g, '$1', /^\./, '0.']


function main() {
  AnyBalance.setDefaultCharset('utf-8');
  
  var prefs = AnyBalance.getPreferences();
  var region = prefs.region || 'rzn'; // Рязань по умолчанию
  var type = prefs.type || 'total'; // Смотрим "ИТОГО" по умолчанию
  
  var task = g_region_change[region].task || 'login';
  var inputName = g_region_change[region].inputName || 'accountNumberAbn';
  
  
  AB.checkEmpty(prefs.login, 'Введите логин без пробелов и разделителей!');
  
  
  AnyBalance.trace('Selected region: ' + region);
  var baseurl = 'http://old.mpkvc.ru/';
  
  var info = AnyBalance.requestGet(baseurl + "index.php?option=com_private", g_headers);
  
  if (!info || AnyBalance.getLastStatusCode() > 400) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
  }
  
  AnyBalance.trace("Redirected to: " + AnyBalance.getLastUrl());
  
  var baseurlLogin = getParam(AnyBalance.getLastUrl(), /^http?:\/\/[^\/]*/i) + '/';
  AnyBalance.trace("baseurlLogin: " + baseurlLogin);
  
  
  var form = getElement(info, new RegExp("<form[^>]+" + task + "[^>]*>", "i"));
  if (!form) {
    throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
  }
  
  var params = createFormParams(form, function(params, str, name, value) {
    if (new RegExp(inputName, "i").test(name))
      return prefs.login;

    return value;
  }, true);
  
  var action = getParam(form, /<form[^>]+action="([^"]*)/, replaceHtmlEntities);
  
  // Заходим на главную страницу
  var info = AnyBalance.requestPost(joinUrl(baseurlLogin, action), params, g_headers);
  
  if (!/Лицевой счет №  \d+/.test(info)) {
    var error = AB.getParam(info, null, null, /<dd[^>]+class="message message"[^>]*>[\s\S]*?\.text\("([\s\S]*?)"\)[\s\S]*?<\/dd>/i,
      AB.replaceTagsAndSpaces);
    if (error) {
      throw new AnyBalance.Error(error, null, /лицевой/i.test(error));
    }


    if (AnyBalance.getLastStatusCode() >= 500) {
      AnyBalance.trace(info);
      throw new AnyBalance.Error(
        'Ошибка сервера. Подождите немного и попробуйте ещё раз. Если ошибка сохраняется долгое время, попробуйте войти в личный кабинет через браузер. Если там то же самое, обращайтесь в поддержку МП "КВЦ".'
      );
    }

    AnyBalance.trace(info);
    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
  }
  
  var result = {
    success: true
  };
  
  var html = AnyBalance.requestPost(joinUrl(baseurl, 'component/private/?task=sprcur'), null, g_headers);
  
  getParam(html, result, 'personal_account', /<div>Л\/счет:\s([\d]*?)<\/div>/i, replaceTagsAndSpaces);
  getParam(html, result, 'address', /<div>Адрес:\s([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
  getParam(html, result, 'area', /<div>Площадь общая:\s([\d]*(?:[.,]\d+)?)\sм<sup>2<\/sup>/i, replaceFloat, parseFloat);
  getParam(html, result, 'registered_number', /Количество зарегистрированных:\s([\d])\sчел.<\/div>/i, replaceFloat, parseFloat);
  getParam(html, result, 'owner', /<div>Собственник\(и\)\s-\s([\d]*?)\sчел.<\/div>/i, replaceFloat, parseFloat);
  
  AnyBalance.trace('Selected type: ' + type);
  if(type == 'service') {
    var tblAccrualDebts = getElements(html, /<table[^>]+class="ttt"[^>]*>[\s\S]*?<\/table>/i);
    tblAccrualDebts = replaceAll(tblAccrualDebts, [/<tr[^>]*><th[^>]+colspan="9"*>[\s\S]*?<\/th><\/tr>/ig, '']);

    processServices(tblAccrualDebts, result);
    
    var tblCounters = getElements(html, /<table[^>]+class="ttt ttt2"[^>]*>([\s\S]*?)<\/table>/i);
    tblCounters = replaceAll(tblCounters, [/<caption[^>]+class="bold"*>[\s\S]*?<\/caption>/ig, '']);
    
    var counters = [];
    var colsDefCounters = {
      __serviceName: {
        re: /Услуга/i,
        result_func: null
      },
      price: {
        re: /Тариф/i,
        result_func: parseBalanceWithDefaultValue
      },
      indicationsFirstDay: {
        re: /Показания/i,
        if_assigned: 'price',
        result_func: parseBalanceWithDefaultValue
      },
      indicationsCurrentDay: {
        re: /Показания/i,
        if_assigned: 'indicationsFirstDay',
        result_func: parseBalanceWithDefaultValue
      }
    };
    
    processTable(tblCounters, counters, '', colsDefCounters);
    
    for (var service of counters) {
      if(service.__serviceName == result['__tariff']) {
        result['price'] = service.price;
        result['indicationsFirstDay'] = service.indicationsFirstDay;
        result['indicationsCurrentDay'] = service.indicationsCurrentDay;
      }
    }
  }
  else if(type == 'total') {
    var tblTotal = getElements(html, /<tr[^>]+class="bold"[^>]*>\s\s<td[^>]*>ИТОГО[\s\S]+<\/td>[\s\S]*?<\/tr>/ig);
    var trTotalOverUnder = replaceAll(tblTotal, [/<td[^>]+rowspan="2"[^>]*>[\s\S]*?<\/td>/ig, '']);
    
    var totalOverUnder = [];
    var colsDefTotalOverUnder = {
      __title: {
        idx: 0,
        result_func: null
      },
      __paymentFirstDay: {
        idx: 1,
        result_func: parseBalanceWithDefaultValue
      },
      __paymentCurrentDay: {
        idx: 2,
        result_func: parseBalanceWithDefaultValue
      }
    };
    
    processTableRows(trTotalOverUnder, totalOverUnder, '', colsDefTotalOverUnder);
    
    for (var t of totalOverUnder) {
      var prefixParam = g_prefix[t.__title];
      
      result[prefixParam + '_paymentFirstDay'] = t.__paymentFirstDay;
      result[prefixParam + '_paymentCurrentDay'] = t.__paymentCurrentDay;
      
      if (prefixParam == 'TUnder') {
        result['balance'] = -1 * t.__paymentCurrentDay;
      }
    }
    
    var total = [];
    var colsDefTotal = {
      totalAccrued: {
        idx: 4,
        result_func: parseBalanceWithDefaultValue
      },
      totalPaid: {
        idx: 6,
        result_func: parseBalanceWithDefaultValue
      }
    };
    
    processTableRows(tblTotal[0], total, '', colsDefTotal);
    
    result['totalAccrued'] = total[0].totalAccrued;
    result['totalPaid'] = total[0].totalPaid;
    
    result['__tariff'] = 'ИТОГО';
  }
  
  AnyBalance.setResult(result);
}

function processTableRows(tableRows, result, path, colsDef, onWrongSize, onFilledResult) {
    function initCols(colsDef) {
        var cols = {};

        for (var name in colsDef) {
          var def = colsDef[name];
          cols[name] = def.idx;
        }

        return cols;
    }
    
    var trs = getElements(tableRows, /<tr[^>]*>/ig);
    var cols, size;
    for (var i = 0; i < trs.length; i++) {
        var tr = trs[i];
        var tds = getElements(tr, /<td[^>]*>/ig);
        if (i == 0) {
            size = tds.length;
            cols = initCols(colsDef);
        }
        
        if (tds.length == size) {
            var t = {};

            fillColsResult(colsDef, cols, tds, t, path);
            if (onFilledResult)
                onFilledResult(t, path);

            result.push(t);
        } else if (onWrongSize) {
            onWrongSize(tr, tds);
        }
    }
}

function processServices(tblAccrualDebts, result) {
  var prefs = AnyBalance.getPreferences();
  
  var services = [];
  
  var colsDefAccrualDebts = {
    __code: {
      re: /Код/i,
      result_func: function(str) {
        return getParam(replaceAll(str, replaceSpaces), /([\u2212\u2013\u2014–\-]?[.,]?\d[\d'.,]*)/, replaceFloat, parseFloat);
      }
    },
    __serviceName: {
      re: /Услуга/i,
      result_func: null
    },
    overUnderPaymentFirstDay: {
      re: /Переплата/i,
      if_assigned: 'serviceName',
      result_func: parseBalanceWithDefaultValue
    },
    consumption: {
      re: /Потреб/i,
      result_func: parseBalanceWithDefaultValue
    },
    price: {
      re: /Тариф/i,
      result_func: parseBalanceWithDefaultValue
    },
    accrued: {
      re: /Начислено/i,
      result_func: parseBalanceWithDefaultValue
    },
    recalculation: {
      re: /Перерасчет/i,
      result_func: parseBalanceWithDefaultValue
    },
    paid: {
      re: /Оплачено/i,
      result_func: parseBalanceWithDefaultValue
    },
    __overUnderPaymentCurrentDay: {
      re: /Переплата/i,
      if_assigned: 'paid',
      result_func: parseBalanceWithDefaultValue
    }
  };
  
  processTable(tblAccrualDebts, services, '', colsDefAccrualDebts);
  AnyBalance.trace('Найдено ' + services.length + ' услуг');
  
  result['numberOfServices'] = services.length;
  
  var productIds = null;
  for (var service of services) {
    if (shouldProcess(service)) {
      processService(service, result);
      productIds = service.__code;
      
      break;
    }
  }
  
  if (!productIds) {
    AnyBalance.Error(prefs.code ? 'Не найдена услуга с кодом ' + prefs.code : 'У вас нет ни одной услуги!');
  }
}

function processService(service, result) {
  AnyBalance.trace('Обработка услуги ' + service.__serviceName);
  
  result['__tariff'] = service.__serviceName;
  result['overUnderPaymentFirstDay'] = service.overUnderPaymentFirstDay;
  result['consumption'] = service.consumption;
  result['price'] = service.price;
  result['accrued'] = service.accrued;
  result['recalculation'] = service.recalculation;
  result['paid'] = service.paid;
  result['overUnderPaymentCurrentDay'] = service.__overUnderPaymentCurrentDay;
  
  result['balance'] = -1 * service.__overUnderPaymentCurrentDay;
}

function shouldProcess(info) {
  var prefs = AnyBalance.getPreferences();
  
  if(!prefs.code)
    return true;
  
  if(info.__code == prefs.code)
    return true;

  return false;
}

function parseBalanceWithDefaultValue(text, silent) {
  silent = typeof silent !== 'undefined' ? silent : true;
  
  var val = getParam(replaceAll(text, replaceSpaces), /([\u2212\u2013\u2014–\-]?[.,]?\d[\d'.,]*)/, replaceFloat, parseFloat);
  var result = typeof val !== 'undefined' ? val : 0;
  
  if (!silent) {
    AnyBalance.trace('Parsing balance (' + result + ') from: ' + text);
  }
  
  return result;
}
