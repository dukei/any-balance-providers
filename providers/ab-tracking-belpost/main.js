
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

function mergeSorted(a, b, key) {
  var answer = new Array(a.length + b.length), i = 0, j = 0, k = 0;
  while (i < a.length && j < b.length) {
    if (a[i][key] < b[j][key]) {
        answer[k] = a[i];
        i++;
    }else {
        answer[k] = b[j];
        j++;
    }
    k++;
  }
  while (i < a.length) {
    answer[k] = a[i];
    i++;
    k++;
  }
  while (j < b.length) {
    answer[k] = b[j];
    j++;
    k++;
  }
  return answer;
}

function main() {
  var prefs = AnyBalance.getPreferences();
  var baseurl = 'http://webservices.belpost.by/searchRu.aspx';
  AnyBalance.setDefaultCharset('utf-8');

  AB.checkEmpty(prefs.cargo, 'Введите номер отправления!');

  var html = AnyBalance.requestGet(baseurl, g_headers);

  if (!html || AnyBalance.getLastStatusCode() > 400) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
  }

  AnyBalance.sleep(1000);

  html = AnyBalance.requestGet(baseurl + '?search=' + prefs.cargo, g_headers);

  if (!/<input[^>]*id="[^"]*Search[^"]*"[^>]*>/i.test(html)) {
    AnyBalance.trace(html);
    throw new AnyBalance.Error('Не удалось найти кнопку поиска. Сайт изменен?');
  }

  if (/не\s+найдено/i.test(html)) {
    throw new AnyBalance.Error('По данному отправлению ничего не найдено', null, /ничего\s+не\s+найдено/i.test(html));
  }

  var result = {
    success: true
  };

  var infoTables = AB.getElements(html, /<table[^>]*id="[^"]*info[^"]*"[^>]*>/ig);
  var colsDefInter = {
		__date: {
			re: /Дата/i,
			result_func: parseDateISO,
		},
		__descr: {
            re: /Событие/i,
            result_func: null,
        },
		__office: {
            re: /Офис/i,
            result_func: null,
        },
	};

  var colsDefInner = {
		__date: {
			re: /Дата/i,
			result_func: parseDate,
		},
		__descr: {
            re: /Событие/i,
            result_process: function(path, td, result){
                td = replaceAll(td, replaceTagsAndSpaces);
                getParam(td, result, '__descr', /^([\s\S]*?)[^)]*$/i);
                getParam(td, result, '__office', /[^)]*$/i);
            }
        },
	};

  var trArray = AB.sumParam(infoTables, null, null, /<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  var inters = [], inners = [];
  if(infoTables[0])
  	processTable(infoTables[0], inters, '', colsDefInter);
  if(infoTables[1])
  	processTable(infoTables[1], inners, '', colsDefInner);

  var events = mergeSorted(inters, inners, '__date');
  var fresh = events[events.length - 1];

  AB.getParam(fresh.__date, result, 'date');
  AB.getParam(fresh.__descr, result, 'status');
  AB.getParam(fresh.__office, result, 'post_office');

  if (AnyBalance.isAvailable('fulltext')) {
    var
      date, office, status, fullInfo = [];

    for (var i = events.length - 1; i >= 0; i--) {
      date = getFormattedDate({format: 'DD/MM/YYYY'}, new Date(events[i].__date));
      status = events[i].__descr;
      office = events[i].__office;
      fullInfo.push('Дата: <b>' + date + '</b> ' + 'Cобытие: ' + status + '. ' + 'Офис: ' + office);
    }
    AB.getParam(fullInfo.join('<br/>'), result, 'fulltext');
  }
  AnyBalance.setResult(result);
}
