/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 Tele2 Business
*/

var g_headers = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
  'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
  'Connection': 'keep-alive',
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

var g_tokenPrefix;
var baseurl = 'https://lk.tele2.ru/';

function main() {
  var prefs = AnyBalance.getPreferences();
  AnyBalance.setDefaultCharset('utf-8');

  AB.checkEmpty(prefs.login, 'Введите логин!');
  AB.checkEmpty(prefs.password, 'Введите пароль!');

  var html = AnyBalance.requestGet(baseurl + '', g_headers);

  if (!html || AnyBalance.getLastStatusCode() > 400) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
  }

  var
    loginPageToken = AB.getParam(html, null, null, /id:'bscLoginPage'[\s\S]*?dt:'([^']*)'/i, AB.replaceTagsAndSpaces),
    loginToken = AB.getParam(html, null, null, /'([^']*)',\{id:'loginUserName'/i, AB.replaceTagsAndSpaces),
    passwordToken = AB.getParam(html, null, null, /'([^']*)',\{id:'loginUserPassword'/i, AB.replaceTagsAndSpaces),
    loginFormToken = AB.getParam(html, null, null, /'([^']*)',\{id:'bscLoginForm'/i, AB.replaceTagsAndSpaces);

  AnyBalance.trace(loginPageToken + ' | ' + loginToken + ' | ' + passwordToken + ' | ' + loginFormToken);

  var
    data_0 = {
      'value': prefs.login,
      'start': prefs.login.length
    },
    data_1 = {
      'value': prefs.password,
      'start': prefs.password.length
    },
    data_2 = {
      '': prefs.password
    };

  var authData = {
    'dtid': loginPageToken,
    'cmd_0': 'onChange',
    'uuid_0': loginToken,
    'data_0': JSON.stringify(data_0),
    'cmd_1': 'onChange',
    'uuid_1': passwordToken,
    'data_1': JSON.stringify(data_1),
    'cmd_2': 'onLoginRequest',
    'opt_2': 'i',
    'uuid_2': loginFormToken,
    'data_2': JSON.stringify(data_2)
  };

  html = AnyBalance.requestPost(baseurl + 't2bsc/zkau', authData, AB.addHeaders({
    Referer: baseurl + 't2bsc/login_bsc.zul'
  }));

  var error = AB.getParam(html, null, null, /value:['"]([^"']*)['"]/i, AB.replaceTagsAndSpaces);
  if (error) {
    throw new AnyBalance.Error(error, null, /логин|пароль/i.test(error));
  }

  html = AnyBalance.requestGet(baseurl + 't2bsc/start', g_headers);

  if (!/logout|Выход/i.test(html)) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
  }

  AnyBalance.trace('Успешная авторизация');

  g_tokenPrefix = getParam(html, null, null, /<div[^>]+id="([^"]*)_"[^>]*class="z-temp"/i, replaceHtmlEntities);
  AnyBalance.trace('Global token prefix: ' + g_tokenPrefix);

  var result = {success: true};

  AB.getParam(html, result, 'contractNumber', /Номер\s+контракта[\s\S]*?value:['"]([^'"]*)['"]/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'accountNumber', /Номер\s+л\/с[\s\S]*?value:['"]([^'"]*)['"]/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'contractName', /Контактное\s+лицо[\s\S]*?value:['"]([^'"]*)['"]/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'contractEmail', /лицо[\s\S]*?Email[\s\S]*?value:['"]([^'"]*)['"]/i, AB.replaceTagsAndSpaces);
  AB.getParam(html, result, 'contractPhone', /Контактный\s+телефон[\s\S]*?value:['"]([^'"]*)['"]/i, AB.replaceTagsAndSpaces);

  if (AnyBalance.isAvailable('balance', 'creditLimit')) {
    try {
      var balancePageToken  = AB.getParam(html, null, null, /dt:['"]([^'"]*)['"]/i, AB.replaceTagsAndSpaces),
          balanceTabToken   = AB.getParam(html, null, null, /['"]([^']*)['"],{id:['"]contractBalanceTab/i, AB.replaceTagsAndSpaces);

      AnyBalance.trace(balancePageToken + ' | ' + balanceTabToken);

      data_0 = {
        'items': [balanceTabToken],
        'reference': balanceTabToken
      };

      authData = {
        'dtid': balancePageToken,
        'cmd_0': 'onSelect',
        'uuid_0': balanceTabToken,
        'data_0': JSON.stringify(data_0)
      };

      var html_data = AnyBalance.requestPost(baseurl + 't2bsc/zkau', authData, AB.addHeaders({
        Referer: baseurl + 't2bsc/base_bsc.zul?page=start'
      }));

      var json = AB.getJsonEval(html_data);
      //Опять таки надо искать кей с HTML и потом по нему искать баланс и кредитный лимит
      var balance_key       = getParam(html, null, null, /Остаток средств(?:[^']*'){10}([^']*)/i),
          credit_limit_key  = getParam(html, null, null, /Лимит кредита(?:[^']*'){10}([^']*)/i);

      if(!balance_key || !credit_limit_key) {
        throw new AnyBalance.Error("Не удалось найти ключи балансов по контракту.");
      }

      for(var i = 0; i < json.rs.length; i++) {
        if(json.rs[i][1][0] == balance_key) {
          AB.getParam(json.rs[i][1][2] + '', result, 'balance', null, AB.replaceTagsAndSpaces, AB.parseBalance);
        } else if(json.rs[i][1][0] == credit_limit_key) {
          AB.getParam(json.rs[i][1][2] + '', result, 'creditLimit', null, AB.replaceTagsAndSpaces, AB.parseBalance);
        }
      }

      AB.getParam('50 руб', result, ['currency', 'balance'], null, AB.replaceTagsAndSpaces, AB.parseCurrency);

    } catch (e) {
      AnyBalance.trace('Не удалось получить данные об остатке средств: ' + e);
    }
  }

  if (AnyBalance.isAvailable('subscribersList', 'subscribersNumber',
      'personalFunds', 'personalBalance', 'personalPhone', 'personalStatus', 'personalName', 'personalTimestamp', 'personalType')) {
    try {
      var subscribersPageToken = AB.getParam(html, null, null, /dt:['"]([^'"]*)['"]/i),
          subscribersTabToken  = AB.getParam(html, null, null, /['"]([^']*)['"],{id:['"]subscribersTab/i, AB.replaceTagsAndSpaces),
          editToken            = AB.getParam(html, null, null, /'zul.wgt.Label'[^\]]*value:'Номер'[\s\S]*?'zul.inp.Textbox',\s*'([^']*)/i),
          buttonSearchToken    = AB.getParam(html, null, null, /['"]([^'"]*)['"],{id:['"]subscribersListSearchButton/i);

      AnyBalance.trace(subscribersPageToken + ' | ' + subscribersTabToken + ' | ' + editToken + ' | ' + buttonSearchToken);

      data_0 = {
        'items': [subscribersTabToken],
        'reference': subscribersTabToken
      };

      authData = {
        'dtid': subscribersPageToken,
        'cmd_0': 'onSelect',
        'uuid_0': subscribersTabToken,
        'data_0': JSON.stringify(data_0)
      };

      var html_data = AnyBalance.requestPost(baseurl + 't2bsc/zkau', authData, AB.addHeaders({
        Referer: baseurl + 't2bsc/base_bsc.zul?page=start'
      }));

      //setPersonalBalance(html_data, result);
      getBalance(html, html_data, result);
      getAbonents(html, html_data, subscribersPageToken, result);

      if(prefs.phone){
        AnyBalance.trace('Пробуем получить информацию по номеру ' + prefs.phone);

        html_data = AnyBalance.requestPost(baseurl + 't2bsc/zkau', {
          dtid: subscribersPageToken,
          cmd_0: 'onChange',
          uuid_0:	editToken,
          data_0:	JSON.stringify({"value":prefs.phone,"start":prefs.phone.length}),
          cmd_1:	'onClick',
          uuid_1:	buttonSearchToken,
          data_1:	JSON.stringify({"pageX":1358,"pageY":246,"which":1,"x":41.5,"y":22})
        }, AB.addHeaders({
          Referer: baseurl + 't2bsc/base_bsc.zul?page=start'
        }));

        var size = getParam(html_data, null, null, /id:'subscribersListBox'[^}]*_totalSize:(\d+)/i, null, parseBalance);
        AnyBalance.trace('Найдено совпадений: ' + size);
        if(size < 1) {
          throw new AnyBalance.Error('Абонент с номером ' + prefs.phone + ' не найден');
        }

      } else {
        //Получаем номер первого телефона в списке
        var phone_num = getParam(html_data, null, null, /Listitem(?:[\s\S]*?)label:'([^']*)/i);
        if(!phone_num) {
          throw new AnyBalance.Error("Не удалось найти номер телефона!");
        }

        html_data = AnyBalance.requestPost(baseurl + 't2bsc/zkau', {
          dtid: subscribersPageToken,
          cmd_0: 'onChange',
          uuid_0:	editToken,
          data_0:	JSON.stringify({"value":phone_num,"start":phone_num.length}),
          cmd_1:	'onClick',
          uuid_1:	buttonSearchToken,
          data_1:	JSON.stringify({"pageX":1358,"pageY":246,"which":1,"x":41.5,"y":22})
        }, AB.addHeaders({
          Referer: baseurl + 't2bsc/base_bsc.zul?page=start'
        }));
      }

      getBalance(html, html_data, result);
      //setSubscribersList(html_data, result);
    } catch (e) {
      AnyBalance.trace('Не удалось получить данные по абонентам: ' + e.message);
    }
  }

  AnyBalance.setResult(result);
}

function getBalance(html, html_data, result) {
  //С HTML нужно получить ключи полей и по ним проводить поиск по json'у.
  try {
    var available_balance_key = getParam(html, null, null, /Доступные личные средства(?:[^']*'){4}([^']*)/i),
        personal_balance_key = getParam(html, null, null, /Личный основной баланс(?:[^']*'){4}([^']*)/i),
        tariff_key = getParam(html, null, null, /'Данные абонента'[\s\S]*?Тарифный план(?:[^']*'){4}([^']*)/i),
        phone_key = getParam(html, null, null, /'Данные абонента'[\s\S]*?Номер телефона(?:[^']*'){4}([^']*)/i),
        status_key = getParam(html, null, null, /'Данные абонента'[\s\S]*?Статус абонента(?:[^']*'){4}([^']*)/i),
        fio_key = getParam(html, null, null, /ФИО(?:[^']*'){4}([^']*)/i),
        type_key = getParam(html, null, null, /Вид абонента(?:[^']*'){4}([^']*)/i),
        time_key = getParam(html, null, null, /'Данные абонента'[\s\S]*?Дата активации(?:[^']*'){4}([^']*)/i);

    if (!available_balance_key || !personal_balance_key) {
      throw new AnyBalance.Error("Не нашли ключи балансов!");
    }

    var json = getJsonEval(html_data);
    if (!isset(result.subscribersNumber)) {
      AB.getParam(json.rs[1][1][2] + '', result, 'subscribersNumber', null, null, AB.parseBalance);
    }

    for (var i = 0; i < json.rs.length; i++) {
      if (json.rs[i][1][0] == available_balance_key) {
        AB.getParam(json.rs[i][1][2] + '', result, 'personalFunds', null, AB.replaceTagsAndSpaces, AB.parseBalance);
      } else if (json.rs[i][1][0] == personal_balance_key) {
        AB.getParam(json.rs[i][1][2] + '', result, 'personalBalance', null, AB.replaceTagsAndSpaces, AB.parseBalance);
      } else if (json.rs[i][1][0] == tariff_key) {
        AB.getParam(json.rs[i][1][2], result, '__tariff', null, AB.replaceTagsAndSpaces);
      } else if (json.rs[i][1][0] == phone_key) {
        AB.getParam(json.rs[i][1][2], result, 'personalPhone', null, AB.replaceTagsAndSpaces);
      } else if (json.rs[i][1][0] == status_key) {
        AB.getParam(json.rs[i][1][2], result, 'personalStatus', null, AB.replaceTagsAndSpaces);
      } else if (json.rs[i][1][0] == fio_key) {
        AB.getParam(json.rs[i][1][2], result, 'personalName', null, AB.replaceTagsAndSpaces);
      } else if (json.rs[i][1][0] == type_key) {
        AB.getParam(json.rs[i][1][2], result, 'personalType', null, AB.replaceTagsAndSpaces);
      } else if (json.rs[i][1][0] == time_key) {
        AB.getParam(json.rs[i][1][2], result, 'personalTimestamp', null, AB.replaceTagsAndSpaces, AB.parseDate);
      }
    }
  } catch(e) {
    AnyBalance.trace('Не удалось получить персональные данные: ' + e);
  }
}

function getAbonents(html, html_data, token, result) {
  var list            = getParam(html_data, null, null, /\['zul.sel.Listitem[\s\S]*?\]{5}/i, [/(.+)/i, '[' + '$1']),
      json            = getJsonEval(list),
      pagingID        = getParam(html, null, null, /zul.mesh.Paging(?:[^']*'){2}([^']*)'[^}]+subscribersListPaging/i),
      subscribersList = [],
      counter         = 1;

    try {
      while(subscribersList.length < result.subscribersNumber) {
        for(var i = 0; i < json.length; ++i) {
          var number = json[i][3][0][2].label,
              name = json[i][3][1][2].label,
              tariff = json[i][3][2][2].label,
              status = json[i][3][3][2].label,
              date = json[i][3][6][2].label;

          subscribersList.push('-- ' + number + ', ' + tariff + ' (' + status + '), ' + date + ', ' + name);

          //На странице отображаются только 5 абонентов, нужно листать страницы
          if (i == json.length - 1) {
            html_data = AnyBalance.requestPost(baseurl + 't2bsc/zkau', {
              dtid: token,
              cmd_0: 'onPaging',
              uuid_0: pagingID,
              data_0: JSON.stringify({"": counter})
            }, AB.addHeaders({
              Referer: baseurl + 't2bsc/base_bsc.zul?page=start'
            }));

            var list = getParam(html_data, null, null, /\['zul.sel.Listitem[\s\S]*?\]{5}/i, [/(.+)/i, '[' + '$1']),
                json = getJsonEval(list);
          }
        }
        counter++;
        i = 0;
      }


    AB.getParam(subscribersList.join(';\n'), result, 'subscribersList');
  } catch(e) {
    AnyBalance.trace("Не удалось получить данные по списку абонентов: " + e)
  }
}


//Вот это вот пока оставим. Мало ли что
function setSubscribersList(html, result) {
  try {
    var
      phone,
      name, tariff, status, date, timestamp,
      data = {
        prefix: '[\'"]',
        phone: ['x3', '[\'"][\\s\\S]*?label:[\'"]([^\'"]*)[\'"]'],
        tariff: ['z3', '[\'"][\\s\\S]*?label:[\'"]([^\'"]*)[\'"]'],
        status: ['_4', '[\'"][\\s\\S]*?label:[\'"]([^\'"]*)[\'"]'],
        name: ['y3', '[\'"][\\s\\S]*?label:[\'"]([^\'"]*)[\'"]'],
        timestamp: ['24', '[\'"][\\s\\S]*?label:[\'"]([^\'"]*)[\'"]']
      },
      subscribersList = [],
      elements = AB.sumParam(html, null, null, /['"]([^'"]*)x3['"]/gi);

    AB.getParam(elements.length, result, 'subscribersNumber');

    for (var i = 0; i < elements.length; i++) {
      phone = AB.getParam(html, null, null, setRegular(elements[i], data.phone[0], [data.prefix, data.phone[1]]), AB.replaceTagsAndSpaces);
      tariff = AB.getParam(html, null, null, setRegular(elements[i], data.tariff[0], [data.prefix, data.tariff[1]]), AB.replaceTagsAndSpaces);
      status = AB.getParam(html, null, null, setRegular(elements[i], data.status[0], [data.prefix, data.status[1]]), AB.replaceTagsAndSpaces);
      name = AB.getParam(html, null, null, setRegular(elements[i], data.name[0], [data.prefix, data.name[1]]), AB.replaceTagsAndSpaces);
      timestamp = AB.getParam(html, null, null, setRegular(elements[i], data.timestamp[0], [data.prefix, data.timestamp[1]]),
        AB.replaceTagsAndSpaces);

      subscribersList.push('номер:' + phone + ' тариф:' + tariff + '  статус:' + status + ' подключено:' +
        timestamp + ' абонент:' + name);
    }

    AB.getParam(subscribersList.join(', '), result, 'subscribersList');

  } catch (e) {
    AnyBalance.trace('Не удалось получить данные по списку абонентов ' + e);
  }
}

function setPersonalBalance(html, result) {
  // TODO: адаптировать для разных типов учётных записей
  //	тестировалось на обычном типе учётной записи
  try {
    var
      data = {
        prefix: '[\'"]',
        phone: ['5i', '[\'"][\\s\\S]*?value[\'"],[\'"]([^\'"]*)[\'"]'],
        tariff: ['2i', '[\'"][\\s\\S]*?value[\'"],[\'"]([^\'"]*)[\'"]'],
        status: ['_i', '[\'"][\\s\\S]*?value[\'"],[\'"]([^\'"]*)[\'"]'],
        name: ['uh', '[\'"][\\s\\S]*?value[\'"],[\'"]([^\'"]*)[\'"]'],
        timestamp: ['hi', '[\'"][\\s\\S]*?value[\'"],[\'"]([^\'"]*)[\'"]'],
        type: ['xh', '[\'"][\\s\\S]*?value[\'"],[\'"]([^\'"]*)[\'"]'],
        funds: ['bj', '[\'"][\\s\\S]*?value[\'"],[\'"]([^\'"]*)[\'"]'],
        balance: ['ej', '[\'"][\\s\\S]*?value[\'"],[\'"]([^\'"]*)[\'"]']
      };

    AB.getParam(html, result, 'personalFunds', setRegular(g_tokenPrefix, data.funds[0], [data.prefix, data.funds[1]]), AB.replaceTagsAndSpaces,
      AB.parseBalance);
    AB.getParam(html, result, 'personalBalance', setRegular(g_tokenPrefix, data.balance[0], [data.prefix, data.balance[1]]),
      AB.replaceTagsAndSpaces, AB.parseBalance);
    AB.getParam(html, result, '__tariff', setRegular(g_tokenPrefix, data.tariff[0], [data.prefix, data.tariff[1]]), AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'personalPhone', setRegular(g_tokenPrefix, data.phone[0], [data.prefix, data.phone[1]]), AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'personalStatus', setRegular(g_tokenPrefix, data.status[0], [data.prefix, data.status[1]]),
      AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'personalName', setRegular(g_tokenPrefix, data.name[0], [data.prefix, data.name[1]]), AB.replaceTagsAndSpaces);
    AB.getParam(html, result, 'personalTimestamp', setRegular(g_tokenPrefix, data.timestamp[0], [data.prefix, data.timestamp[1]]), AB.replaceTagsAndSpaces, parseDate);
    AB.getParam(html, result, 'personalType', setRegular(g_tokenPrefix, data.type[0], [data.prefix, data.type[1]]), AB.replaceTagsAndSpaces);
  } catch (e) {
    AnyBalance.trace('Не удалось получить персональные данные ' + e);
  }
}

function setRegular(str, postfix, arr) {
  return new RegExp(arr[0] + str + postfix + arr[1], 'i');
}