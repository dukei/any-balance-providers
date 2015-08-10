/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает курсы драг металлов с сайта Сбербанка

Сайт: http://www.sbrf.ru/moscow/ru/quotes/metals/timeline/
*/

function numSize(num, size){
  var str = num + '';
  if(str.length < size){
    for(var i=str.length; i<size; ++i){
	str = '0' + str;
    }
  }
  return str;
}

function getDateString(dt){
	return numSize(dt.getDate(), 2) + '.' + numSize(dt.getMonth()+1, 2) + '.' + dt.getFullYear();
}

function main(){
	AnyBalance.trace('Connecting to sbrf...');
	var now = new Date();
	var yesterday = new Date(now.getTime() - 1*86400*1000);

        var prefs = AnyBalance.getPreferences();
        var region = (prefs.region || '223').replace(/_\d+$/, ''); //Суффикс нужен только для различия региона в списке, а значимая только первая часть

        var metals = {
            "1": "Au",
            "6": "Ag",
            "28": "Pt",
            "29": "Pd"
        };
	
	var info = AnyBalance.requestPost('http://www.sbrf.ru/common/js/get_quote_values.php', 
            "version=0&inf_block=" + region + "&cbrf=0&group=2&quotes_for=&qid[]=1&qid[]=6&qid[]=28&qid[]=29&_date_afrom114=" + getDateString(yesterday) + "&_date_ato114=" + getDateString(now),
            {
                Accept: '*/*',
                'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
                'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
                'Connection':'keep-alive',
                'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.95 Safari/537.11',
                'Content-Type': 'application/x-www-form-urlencoded',
                Referer: 'http://www.sbrf.ru/moscow/ru/quotes/metals/timeline/',
                'X-Requested-With': 'XMLHttpRequest'
            }
        );
        if(!info)
            throw new AnyBalance.Error('Сбербанк не вернул данные по котировкам, попробуйте ещё раз.', true);

        var json = getJson(info);

	var result = {success: true};

        for(var id in json){
            if(!isset(metals[id]))
                continue;
            var name = metals[id];
            if(!AnyBalance.isAvailable(name + '_buy', name + '_sell', name + '_weight'))
                continue;
            if(!json[id].quotes)
                throw new AnyBalance.Error('Не удается найти котировки для ' + json.meta.TITLE);
            
            var dt_max = "";
            for(var dt in json[id].quotes){
                if(dt > dt_max)
                    dt_max = dt;
            }

            if(!dt_max)
                continue;

            var quote = json[id].quotes[dt_max], weight;
            if(AnyBalance.isAvailable(name + '_buy'))
                result[name + '_buy'] = parseFloat(quote.buy);
            if(AnyBalance.isAvailable(name + '_sell'))
                result[name + '_sell'] = parseFloat(quote.sell);
            if(AnyBalance.isAvailable(name + '_weight') && (weight = getWeight(name)))
                result[name + '_weight'] = parseFloat(quote.buy)*weight;
            if(AnyBalance.isAvailable('date'))
                result.date = Date.parse(dt_max);
        }

        //buildRegions(result);
	
	AnyBalance.setResult(result);
}

function getWeight(metal){
	var prefs = AnyBalance.getPreferences();
	if(!prefs.weight)
		return undefined;
	if(/^[\d\s\.,]+$/.test(prefs.weight))
		return parseBalance(prefs.weight);
	var weight = getParam(prefs.weight, null, null, new RegExp(metal + '\s*:([^;a-z]*)', 'i'), null, parseBalance);
	return weight;
}

function buildRegions(result){
    var html = AnyBalance.requestGet('http://www.sbrf.ru/chelyabinsk/ru/quotes/metals/timeline/');
    var regions = sumParam(html, null, null, /(<div class="region_item"[^>]*>([\s\S]*?)<\/div>)/ig);
    AnyBalance.trace('Found ' + regions.length + ' regions');
    var names = [], values = [];
    for(var i=0; i<regions.length; ++i){
        var id = sumParam(regions[i], null, null, /region=['"]([^'"]*)/i)[0];
        AnyBalance.trace('Getting region: ' + id);
        html = AnyBalance.requestGet('http://www.sbrf.ru/' + id + '/ru/quotes/metals/timeline/');
        var inf_block = sumParam(html, null, null, /name="inf_block"[^>]*value="([^"]*)/i)[0];
        if(!inf_block)
            throw new AnyBalance.Error('Could not get inf_block for ' + id);
        names[names.length] = sumParam(regions[i], null, null, /([\s\S]*)/i, replaceTagsAndSpaces)[0];
        values[values.length] = inf_block + '_' + i;
    }

    result.regions = names.join('|');
    result.region_values = values.join('|');
}
